# 03 — Signal & Webhook Flow

> **App:** Bun + Hono Backend (`apps/api`). This does NOT live in Next.js.

## Endpoint

```
POST /api/webhooks/bot/[botId]
```

This is the ONLY entry point for automated trading signals. TradingView or any alerting tool calls this endpoint.

---

## Webhook Payload (Expected Format)

```json
{
  "secret": "bot-webhook-secret",
  "action": "ENTER_LONG",
  "symbol": "BTCFDUSD"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| secret | string | ✅ | Must match `Bot.webhookSecret` in DB |
| action | SignalAction | ✅ | ENTER_LONG, ENTER_SHORT, EXIT_LONG, EXIT_SHORT |
| symbol | string | ✅ | Must be in `Bot.pairs` array |

---

## Processing Steps (In Order)

### Step 1 — Validate Request
```
1. Parse JSON body
2. Find Bot by botId (URL param)
3. If bot not found → 404
4. If bot.status !== ACTIVE → 400 "Bot is not active"
5. If payload.secret !== bot.webhookSecret → 401 "Invalid secret"
6. If payload.symbol not in bot.pairs → 400 "Symbol not configured for this bot"
```

### Step 2 — Create Signal Record (ALWAYS, even if we'll skip it)
```typescript
const signal = await prisma.signal.create({
  data: {
    botId:      bot.id,
    action:     payload.action,
    symbol:     payload.symbol,
    status:     'PENDING',
    processed:  false,
    rawPayload: payload,  // store full payload for debugging
  }
})
```
**Why:** Every webhook hit must be logged. This is the audit trail.

### Step 3 — Acquire Idempotency Lock
```typescript
// Atomic update — only one process can claim this signal
const locked = await prisma.signal.updateMany({
  where: { id: signal.id, processed: false },
  data:  { processed: true, status: 'PROCESSING' }
})

if (locked.count === 0) {
  // Another process already claimed it — abort
  return Response.json({ skipped: true })
}
```
**Why:** TradingView can fire duplicate alerts. This prevents double-execution.

### Step 4 — Check Existing Open Position
```typescript
const openPosition = await prisma.position.findFirst({
  where: { botId: bot.id, status: 'OPEN' }
})
```

### Step 5 — Apply Signal Decision Logic

See the full decision table in `docs/04-position-lifecycle.md`.

In summary:
- No open position + ENTER_* → Create new position
- Open position + matching EXIT_* → Close position
- Anything else → Skip with reason

### Step 6 — Update Signal Final Status
```typescript
await prisma.signal.update({
  where: { id: signal.id },
  data: {
    status:      'PROCESSED' | 'SKIPPED' | 'FAILED',
    positionId:  createdPosition?.id ?? null,
    processedAt: new Date(),
    errorMessage: error?.message ?? null,
  }
})
```

### Step 7 — Return Response
```typescript
// Always return 200 to TradingView to prevent retries
// Use status field in body to communicate result
return Response.json({
  success: true,
  signalId: signal.id,
  action: 'OPENED' | 'CLOSED' | 'SKIPPED',
  reason: '...'
})
```
**Important:** Always return HTTP 200 even for SKIPPED signals. If you return 4xx/5xx, TradingView will retry and create duplicate signals.

---

## Error Handling

```typescript
try {
  // ... all processing logic
} catch (error) {
  await prisma.signal.update({
    where: { id: signal.id },
    data: { status: 'FAILED', errorMessage: error.message }
  })
  // Still return 200 to prevent TradingView retries
  return Response.json({ success: false, error: error.message })
}
```

---

## Full Route Skeleton

```typescript
// /app/api/webhooks/bot/[botId]/route.ts

export async function POST(
  req: Request,
  { params }: { params: { botId: string } }
) {
  const payload = await req.json()

  // Step 1: Validate
  const bot = await prisma.bot.findUnique({ where: { id: params.botId } })
  if (!bot) return Response.json({ error: 'Bot not found' }, { status: 404 })
  if (bot.status !== 'ACTIVE') return Response.json({ error: 'Bot inactive' }, { status: 400 })
  if (payload.secret !== bot.webhookSecret) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Step 2: Create signal
  const signal = await prisma.signal.create({ data: { ... } })

  // Step 3: Lock
  const locked = await prisma.signal.updateMany({
    where: { id: signal.id, processed: false },
    data: { processed: true, status: 'PROCESSING' }
  })
  if (locked.count === 0) return Response.json({ skipped: true })

  try {
    // Step 4-6: Process signal
    await processSignal(signal, bot)
    return Response.json({ success: true })
  } catch (err) {
    await prisma.signal.update({
      where: { id: signal.id },
      data: { status: 'FAILED', errorMessage: err.message }
    })
    return Response.json({ success: false, error: err.message })
  }
}
```

---

## Full Route Skeleton (Hono)

```typescript
// apps/api/src/routes/webhooks.ts
import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { processSignal } from '../services/signal-processor'

export const webhookRoutes = new Hono()

webhookRoutes.post('/bot/:botId', async (c) => {
  const { botId } = c.req.param()
  const payload = await c.req.json()

  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { exchange: true }
  })
  if (!bot)                                  return c.json({ error: 'Bot not found' }, 404)
  if (bot.status !== 'ACTIVE')               return c.json({ error: 'Bot inactive' }, 400)
  if (payload.secret !== bot.webhookSecret)  return c.json({ error: 'Unauthorized' }, 401)
  if (!bot.pairs.includes(payload.symbol))   return c.json({ error: 'Symbol not configured' }, 400)

  const signal = await prisma.signal.create({
    data: { botId: bot.id, action: payload.action, symbol: payload.symbol,
            status: 'PENDING', processed: false, rawPayload: payload }
  })

  const locked = await prisma.signal.updateMany({
    where: { id: signal.id, processed: false },
    data:  { processed: true, status: 'PROCESSING' }
  })
  if (locked.count === 0) return c.json({ skipped: true })

  try {
    await processSignal(signal, bot)
    return c.json({ success: true, signalId: signal.id })
  } catch (err) {
    await prisma.signal.update({
      where: { id: signal.id },
      data:  { status: 'FAILED', errorMessage: err.message }
    })
    return c.json({ success: false, error: err.message }) // Always 200
  }
})
```
