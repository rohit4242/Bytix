# 10 — Error Handling

## Error Sources in client/

| Source | Type | How to Handle |
|--------|------|--------------|
| Server Action throws | `Error` | Catch in `useMutation.onError` → `toast.error` |
| Server Action from `server/` (Hono) | `Error` with Hono message | Same — already unwrapped by `serverClient` |
| Zod validation fails | `ZodError` | React Hook Form shows field errors automatically |
| Auth fails (`requireAuth`) | `AuthError` | Next.js redirects via middleware |
| Not found | `NotFoundError` | `notFound()` in server component |
| Prisma error | `PrismaClientKnownRequestError` | Catch and return friendly message |

---

## Error Classes (auth-helpers.ts)

```typescript
// Already defined in client/lib/auth-helpers.ts
export class AuthError extends Error {
  status = 401
  constructor(message: string) { super(message) }
}

export class NotFoundError extends Error {
  status = 404
  constructor(message: string) { super(message) }
}

export class ValidationError extends Error {
  status = 400
  constructor(message: string) { super(message) }
}
```

---

## Server Action Error Wrapper

Wrap all Server Actions that touch Prisma to give friendly error messages:

```typescript
// client/lib/action-handler.ts
import { Prisma } from '@prisma/client'

export async function handleAction<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    // Prisma unique constraint (e.g. duplicate exchange label)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw new Error('A record with this value already exists.')
      if (err.code === 'P2025') throw new Error('Record not found.')
    }
    // Re-throw everything else as-is
    throw err
  }
}

// Usage in action:
export async function createBot(input: unknown) {
  return handleAction(async () => {
    const { user } = await requireAuth()
    // ... rest of action
  })
}
```

---

## Component Error Boundaries

Wrap dashboard sections in error boundaries for graceful degradation:

```tsx
// client/components/ui/error-boundary.tsx
'use client'
import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 border border-red-500/20 rounded-lg text-center">
          <p className="text-sm text-red-400">Something went wrong loading this section.</p>
          <Button size="sm" variant="outline" className="mt-2"
            onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
```

---

## Toast Notifications (Sonner)

```typescript
// client/lib/toast.ts — consistent toast messages
import { toast } from 'sonner'

export const notify = {
  success: (msg: string) => toast.success(msg),
  error:   (err: Error | string) => toast.error(typeof err === 'string' ? err : err.message),
  loading: (msg: string) => toast.loading(msg),
  promise: <T>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
    toast.promise(promise, msgs),
}

// Sonner setup in layout
// import { Toaster } from 'sonner'
// <Toaster position="bottom-right" richColors />
```

---

## Handling Specific Errors

```typescript
// In useMutation onError — show specific messages based on error content
onError: (err: Error) => {
  const msg = err.message

  if (msg.includes('DANGER'))          return toast.error('Trade blocked: Margin account is in danger state')
  if (msg.includes('open positions'))  return toast.error('Close all positions first')
  if (msg.includes('Not authenticated')) {
    toast.error('Session expired. Please log in again.')
    router.push('/login')
    return
  }

  // Generic fallback
  toast.error(msg || 'Something went wrong')
}
```

---

## Next.js Error Pages

```tsx
// client/app/error.tsx — global error boundary
'use client'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// client/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-semibold">Page not found</h2>
    </div>
  )
}
```
