# 12 — Next.js vs Hono: What to Build Where

This is the most important architectural doc. When adding ANY new feature, check this first to decide which app owns it.

---

## The Simple Rule

```
Does it touch Binance, execute trades, calculate P&L,
check risk, or manage WebSockets?
   YES → Build it in Hono
   NO  → Build it in Next.js
```

---

## Next.js App — What It Does

### Server Actions (not API routes)
Next.js uses **Server Actions** for data operations. These run server-side and call Prisma directly. No API route needed for CRUD.

```typescript
// client/app/actions/bots.ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

// READ — display bot list
export async function getBots() {
  const session = await requireAuth()
  return prisma.bot.findMany({
    where: { userId: session.user.id },
    include: { exchange: { select: { label: true, name: true } } }
  })
}

// CREATE — save bot config (no trading logic)
export async function createBot(data: CreateBotInput) {
  const session = await requireAuth()
  // Validate with Zod
  const parsed = createBotSchema.parse(data)
  return prisma.bot.create({
    data: { ...parsed, userId: session.user.id }
  })
}

// UPDATE — edit bot config
export async function updateBot(botId: string, data: UpdateBotInput) {
  const session = await requireAuth()
  await assertBotOwnership(session.user.id, botId)
  return prisma.bot.update({ where: { id: botId }, data })
}

// DELETE — remove bot (only if no open positions)
export async function deleteBot(botId: string) {
  const session = await requireAuth()
  await assertBotOwnership(session.user.id, botId)

  const openPosition = await prisma.position.findFirst({
    where: { botId, status: 'OPEN' }
  })
  if (openPosition) throw new Error('Cannot delete bot with open positions')

  return prisma.bot.delete({ where: { id: botId } })
}
```

### What Next.js Server Actions Handle

| Action | Type | Notes |
|--------|------|-------|
| `getPortfolio()` | Read | Reads Portfolio model directly |
| `getPositions(status)` | Read | Filtered position list |
| `getSignalHistory(botId)` | Read | Signal logs for display |
| `getBots()` | Read | Bot list with config |
| `createBot(data)` | Write | Save bot config only |
| `updateBot(id, data)` | Write | Edit config only |
| `deleteBot(id)` | Write | Check no open positions first |
| `createExchange(data)` | Write | Encrypt API keys, then save |
| `deleteExchange(id)` | Write | Check no active bots first |
| `getBalanceSnapshots()` | Read | For chart data |
| `getOrderHistory(positionId)` | Read | Order log display |
| `updateUserSettings(data)` | Write | Profile, preferences |
| `assignCustomerToAgent(...)` | Write | Admin only |

### The ONE API Route in Next.js

```
/app/api/auth/[...betterauth]/route.ts   ← Better Auth only
```

That's it. No other API routes in Next.js. Everything else is Server Actions or a call to Hono.

---

## Hono Backend — What It Does

### Routes

```typescript
// server/src/index.ts
import { Hono } from 'hono'

const app = new Hono()

// Public — TradingView calls this
app.route('/webhooks', webhookRoutes)

// Internal — called by Next.js with x-internal-secret header
app.route('/internal', internalRoutes)

// Protected — called by Next.js frontend for trading actions
app.route('/positions', positionRoutes)
app.route('/margin',    marginRoutes)
app.route('/bots',      botActionRoutes)

export default app
```

### Hono Route Files

#### webhooks.ts
```typescript
// POST /webhooks/bot/:botId
// Called by TradingView. No auth header — verified by bot.webhookSecret in payload.
router.post('/bot/:botId', async (c) => {
  // Full flow: validate → create signal → lock → process → respond
  // See docs/03-signal-webhook-flow.md
})
```

#### positions.ts
```typescript
// POST /positions/:positionId/close  — manually close a position
// GET  /positions/:positionId/sync   — force sync from Binance
router.post('/:positionId/close', authMiddleware, async (c) => {
  // Verified by x-internal-secret (called from Next.js)
  // Runs full close flow: cancel SL/TP → place exit order → update DB → calc P&L
})
```

#### internal.ts
```typescript
// POST /internal/signal  — trigger a signal manually from UI
// POST /internal/sync-margin  — force margin account sync
// POST /internal/snapshot  — force a balance snapshot
router.post('/signal', internalAuthMiddleware, async (c) => {
  const { botId, action, symbol } = await c.req.json()
  // Creates a Signal and processes it as if it came from webhook
})
```

#### margin.ts
```typescript
// POST /margin/:exchangeId/sync  — sync margin account from Binance
// GET  /margin/:exchangeId/risk  — get current risk level
```

---

## How Next.js Triggers Trading Actions (Pattern)

When the user clicks "Close Position" in the UI:

```
User clicks button in Next.js UI
        ↓
Server Action called: closePositionAction(positionId)
        ↓
Server Action calls honoClient.closePosition(positionId)
        ↓
Hono /positions/:id/close handles it:
  - Cancel SL/TP orders on Binance
  - Place exit MARKET order
  - Calculate P&L
  - Update DB (position CLOSED, portfolio updated)
        ↓
Server Action returns result to UI
        ↓
UI invalidates React Query cache → data refreshes
```

```typescript
// client/app/actions/positions.ts
'use server'

export async function closePositionAction(positionId: string) {
  const session = await requireAuth()

  // Verify ownership before calling Hono
  const position = await prisma.position.findUnique({ where: { id: positionId } })
  if (!position || position.userId !== session.user.id) throw new Error('Not found')

  // Delegate actual closing to Hono
  const result = await honoClient.closePosition(positionId)
  return result.data
}
```

---

## Shared Prisma — Important Rules

Both apps use Prisma with the **same DATABASE_URL** and **same schema.prisma**.

### Who can write what:

| Model | Next.js can write? | Hono can write? |
|-------|-------------------|----------------|
| User | ✅ (profile only) | ❌ |
| Session / Account | ✅ (Better Auth manages) | ❌ |
| Exchange | ✅ (create/delete) | ✅ (read keys for trading) |
| Bot | ✅ (config CRUD) | ✅ (read config, update status) |
| Signal | ❌ | ✅ (full ownership) |
| Position | ❌ | ✅ (full ownership) |
| Order | ❌ | ✅ (full ownership) |
| Portfolio | ❌ | ✅ (updated after trades) |
| MarginAccount | ❌ | ✅ (sync from Binance) |
| BorrowedAsset | ❌ | ✅ (sync from Binance) |
| BalanceSnapshot | ❌ | ✅ (taken after trades) |
| Transaction | ❌ | ✅ (logged per trade) |

Next.js reads Signal, Position, Order, Portfolio etc. freely for display. It just doesn't write to them.

---

## Auth Across Both Apps

Better Auth lives entirely in Next.js. Hono does NOT use Better Auth.

```
User authentication flow:
  Browser → Next.js Better Auth → Session cookie

Next.js → Hono requests:
  Server Action verifies user session via Better Auth
  Then calls Hono with x-internal-secret header
  Hono trusts the internal secret — no session check needed

TradingView → Hono webhook:
  No session. Verified by payload.secret === bot.webhookSecret
```

This means Hono never needs to know about sessions or users directly — it trusts that Next.js already validated the user before forwarding the request.

---

## Hono App Entry Point

```typescript
// server/src/index.ts
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { webhookRoutes } from './routes/webhooks'
import { positionRoutes } from './routes/positions'
import { internalRoutes } from './routes/internal'
import { marginRoutes } from './routes/margin'
import { startWebSocketManager } from './binance/websocket'
import { startCronJobs } from './jobs'

const app = new Hono()

app.use('*', logger())

app.route('/webhooks', webhookRoutes)
app.route('/positions', positionRoutes)
app.route('/internal', internalRoutes)
app.route('/margin', marginRoutes)

// Start background services on boot
startWebSocketManager()
startCronJobs()

export default {
  port: process.env.PORT ?? 3001,
  fetch: app.fetch,
}
```

---

## Authentication Pattern Between client/ and server/

When `client/` calls `server/`, it passes the Better Auth session token as a Bearer token. `server/` verifies it against the shared DB. No separate JWT system needed.

```typescript
// client/ sends:
Authorization: Bearer sess_abc123...

// server/ verifies:
const session = await prisma.session.findUnique({ where: { token } })
// → same DB, same Session table Better Auth created
```

### Three middlewares in server/:

```
authMiddleware        → Verifies Bearer token, attaches user to context
requireRole(...)      → Gates routes by ADMIN | AGENT | CUSTOMER
(no middleware)       → Webhook routes — verified by payload.secret only
```

### Route protection pattern:
```typescript
// Protected by session
positionRoutes.use('*', authMiddleware)

// Protected by session + role
adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', requireRole('ADMIN'))

// Protected by webhook secret only (no session)
webhookRoutes.post('/bot/:botId', ...)  // No middleware
```

See `docs/10-auth-roles.md` for full implementation code.
