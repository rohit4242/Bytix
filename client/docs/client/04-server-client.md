# 04 — Calling server/ (Hono) from client/

## When to Use

Call `serverClient` from a Server Action when the operation requires:
- Executing a trade (close position, manual order)
- Triggering a signal manually
- Forcing a margin account sync
- Anything that touches Binance

**Never call `serverClient` from a client component directly.** Always go through a Server Action.

```
Client Component → Server Action → serverClient → Hono server/
```

---

## lib/server-client.ts

```typescript
// client/lib/server-client.ts
import { auth }    from './auth'
import { headers } from 'next/headers'
import axios, { AxiosError } from 'axios'

const SERVER_URL = process.env.SERVER_API_URL  // e.g. http://localhost:3001

// Gets the current session Bearer token
async function getAuthHeaders() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')

  return {
    'Authorization': `Bearer ${session.session.token}`,
    'Content-Type':  'application/json',
  }
}

// Wraps axios calls with consistent error handling
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: object
): Promise<T> {
  const h = await getAuthHeaders()

  try {
    const res = await axios({
      method,
      url:     `${SERVER_URL}${path}`,
      headers: h,
      data:    body,
    })
    return res.data
  } catch (err) {
    if (err instanceof AxiosError) {
      // Bubble up the error message from Hono
      const message = err.response?.data?.error ?? err.message
      throw new Error(message)
    }
    throw err
  }
}

// ─── serverClient API ────────────────────────────────────────────

export const serverClient = {

  // Position actions
  closePosition: (positionId: string) =>
    request('POST', `/positions/${positionId}/close`),

  syncPosition: (positionId: string) =>
    request('GET', `/positions/${positionId}/sync`),

  // Signal actions
  triggerSignal: (botId: string, action: string, symbol: string) =>
    request('POST', '/internal/signal', { botId, action, symbol }),

  // Margin actions
  syncMargin: (exchangeId: string) =>
    request('POST', `/margin/${exchangeId}/sync`),

  getMarginRisk: (exchangeId: string) =>
    request('GET', `/margin/${exchangeId}/risk`),

  // Force a balance snapshot (admin use)
  forceSnapshot: () =>
    request('POST', '/internal/snapshot'),
}
```

---

## Usage in Server Actions

```typescript
// client/app/actions/positions.ts
'use server'
import { requireAuth }  from '@/lib/auth-helpers'
import { prisma }       from '@/lib/prisma'
import { serverClient } from '@/lib/server-client'

export async function closePositionAction(positionId: string) {
  const { user } = await requireAuth()

  // 1. Verify ownership in client/ before calling server/
  const position = await prisma.position.findUnique({
    where:  { id: positionId },
    select: { userId: true, status: true },
  })
  if (!position || position.userId !== user.id) throw new Error('Not found')
  if (position.status !== 'OPEN') throw new Error('Position already closed')

  // 2. Delegate to Hono — it handles Binance, P&L, DB updates
  return serverClient.closePosition(positionId)
}
```

---

## Error Handling Pattern

`serverClient` always throws a typed `Error` with the message from Hono's response. Catch it in the component:

```tsx
// In component
const close = useMutation({
  mutationFn: (id: string) => closePositionAction(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['positions'] })
    toast.success('Position closed')
  },
  onError: (err: Error) => {
    // This is the message from Hono e.g. "Margin account in DANGER state"
    toast.error(err.message)
  },
})
```

---

## Timeouts & Retries

Binance orders can take a few seconds. Set a generous timeout:

```typescript
// In server-client.ts axios config
const res = await axios({
  ...
  timeout: 15_000,  // 15 seconds — enough for Binance market order + DB write
})
```

Do NOT retry automatically on failed trade requests — a retry could cause a double order.
