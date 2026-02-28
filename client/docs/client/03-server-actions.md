# 03 — Server Actions Pattern

## The Rule

`client/` uses **Server Actions** for ALL data operations. No API routes (except `/api/auth`). No client-side fetch for writes.

```
Read data  → Server Action → Prisma → return to component
Write data → Server Action → Zod validate → ownership check → Prisma
Trade action → Server Action → ownership check → serverClient → Hono
```

---

## Standard Server Action Template

Every action follows this exact pattern:

```typescript
'use server'

import { requireAuth } from '@/lib/auth-helpers'
import { prisma }       from '@/lib/prisma'
import { z }            from 'zod'

// 1. Define input schema
const createBotSchema = z.object({
  name:              z.string().min(1).max(50),
  exchangeId:        z.string().cuid(),
  tradeType:         z.enum(['SPOT', 'MARGIN']),
  pairs:             z.array(z.string()).min(1),
  tradeAmountUsdt:   z.number().positive().min(10),
  leverage:          z.number().int().min(1).max(20).default(1),
  stopLossPercent:   z.number().min(0.1).max(50).optional(),
  takeProfitPercent: z.number().min(0.1).max(500).optional(),
  useOco:            z.boolean().default(false),
})

// 2. Export the action
export async function createBot(input: unknown) {
  // 3. Always verify session first
  const session = await requireAuth()
  const user    = session.user

  // 4. Always validate input with Zod
  const data = createBotSchema.parse(input)

  // 5. Ownership check (does this exchange belong to the user?)
  const exchange = await prisma.exchange.findUnique({
    where: { id: data.exchangeId },
    select: { id: true, userId: true }
  })
  if (!exchange || exchange.userId !== user.id) {
    throw new Error('Exchange not found')
  }

  // 6. Business rule check
  if (data.tradeType === 'SPOT' && data.leverage > 1) {
    throw new Error('Spot bots cannot use leverage')
  }

  // 7. Write to DB
  const bot = await prisma.bot.create({
    data: {
      ...data,
      userId: user.id,
    }
  })

  return bot
}
```

---

## All Server Actions — Full Reference

### `actions/portfolio.ts`
```typescript
'use server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function getPortfolio() {
  const { user } = await requireAuth()
  return prisma.portfolio.findUnique({ where: { userId: user.id } })
}

export async function getBalanceSnapshots(days = 30) {
  const { user } = await requireAuth()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return prisma.balanceSnapshot.findMany({
    where:   { userId: user.id, snapshotAt: { gte: since } },
    orderBy: { snapshotAt: 'asc' },
  })
}
```

---

### `actions/positions.ts`
```typescript
'use server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma }       from '@/lib/prisma'
import { serverClient } from '@/lib/server-client'

export async function getPositions(status?: 'OPEN' | 'CLOSED' | 'LIQUIDATED') {
  const { user } = await requireAuth()
  return prisma.position.findMany({
    where:   { userId: user.id, ...(status ? { status } : {}) },
    include: { orders: { select: { purpose: true, status: true, avgFillPrice: true } } },
    orderBy: { openedAt: 'desc' },
  })
}

export async function getPosition(positionId: string) {
  const { user } = await requireAuth()
  const position = await prisma.position.findUnique({
    where:   { id: positionId },
    include: { orders: true, bot: { select: { name: true } } },
  })
  if (!position || position.userId !== user.id) throw new Error('Not found')
  return position
}

// This delegates to server/ — client/ does not close positions itself
export async function closePositionAction(positionId: string) {
  const { user } = await requireAuth()

  // Verify ownership before calling server/
  const position = await prisma.position.findUnique({
    where:  { id: positionId },
    select: { userId: true, status: true },
  })
  if (!position || position.userId !== user.id) throw new Error('Not found')
  if (position.status !== 'OPEN') throw new Error('Position is not open')

  // Delegate to Hono — actual Binance logic lives there
  const result = await serverClient.closePosition(positionId)
  return result.data
}
```

---

### `actions/bots.ts`
```typescript
'use server'
import { requireAuth, assertBotOwnership } from '@/lib/auth-helpers'
import { prisma }        from '@/lib/prisma'
import { serverClient }  from '@/lib/server-client'
import { z }             from 'zod'
import { randomBytes }   from 'crypto'

const createBotSchema = z.object({
  name:              z.string().min(1).max(50),
  exchangeId:        z.string().cuid(),
  tradeType:         z.enum(['SPOT', 'MARGIN']),
  marginType:        z.enum(['CROSS', 'ISOLATED']).optional(),
  pairs:             z.array(z.string()).min(1),
  tradeAmountUsdt:   z.number().positive().min(10),
  leverage:          z.number().int().min(1).max(20).default(1),
  stopLossPercent:   z.number().min(0.1).max(50).optional(),
  takeProfitPercent: z.number().min(0.1).max(500).optional(),
  useOco:            z.boolean().default(false),
})

export async function getBots() {
  const { user } = await requireAuth()

  // Role-aware query
  if (user.role === 'ADMIN') {
    return prisma.bot.findMany({
      include: { exchange: { select: { label: true, name: true } }, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  if (user.role === 'AGENT') {
    const customers = await prisma.user.findMany({
      where:  { agentId: user.id },
      select: { id: true },
    })
    return prisma.bot.findMany({
      where:   { userId: { in: customers.map(c => c.id) } },
      include: { exchange: { select: { label: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  return prisma.bot.findMany({
    where:   { userId: user.id },
    include: { exchange: { select: { label: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getBot(botId: string) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)
  return prisma.bot.findUnique({
    where:   { id: botId },
    include: { exchange: { select: { label: true, name: true, isActive: true } } },
  })
}

export async function createBot(input: unknown) {
  const { user } = await requireAuth()
  const data = createBotSchema.parse(input)

  // Verify exchange ownership
  const exchange = await prisma.exchange.findUnique({
    where:  { id: data.exchangeId },
    select: { userId: true, isActive: true },
  })
  if (!exchange || exchange.userId !== user.id) throw new Error('Exchange not found')
  if (!exchange.isActive) throw new Error('Exchange is inactive')

  // Generate webhook secret
  const webhookSecret = randomBytes(32).toString('hex')

  return prisma.bot.create({
    data: { ...data, userId: user.id, webhookSecret },
  })
}

export async function updateBot(botId: string, input: unknown) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)

  const data = createBotSchema.partial().parse(input)
  return prisma.bot.update({ where: { id: botId }, data })
}

export async function toggleBotStatus(botId: string, status: 'ACTIVE' | 'PAUSED') {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)
  return prisma.bot.update({ where: { id: botId }, data: { status } })
}

export async function deleteBot(botId: string) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)

  const openPosition = await prisma.position.findFirst({
    where: { botId, status: 'OPEN' },
  })
  if (openPosition) throw new Error('Cannot delete bot with open positions. Close them first.')

  return prisma.bot.delete({ where: { id: botId } })
}

export async function regenerateWebhookSecret(botId: string) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)

  const webhookSecret = randomBytes(32).toString('hex')
  return prisma.bot.update({ where: { id: botId }, data: { webhookSecret } })
}

// Manually trigger a signal from the UI — delegates to server/
export async function triggerSignalAction(botId: string, action: string, symbol: string) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)
  return serverClient.triggerSignal(botId, action, symbol)
}
```

---

### `actions/exchanges.ts`
```typescript
'use server'
import { requireAuth, assertExchangeOwnership } from '@/lib/auth-helpers'
import { prisma }     from '@/lib/prisma'
import { encrypt }    from '@/lib/encryption'
import { z }          from 'zod'

const createExchangeSchema = z.object({
  label:        z.string().min(1).max(50),
  name:         z.enum(['BINANCE']).default('BINANCE'),
  apiKey:       z.string().min(10),
  apiSecret:    z.string().min(10),
  positionMode: z.enum(['ONE_WAY', 'HEDGE']).default('ONE_WAY'),
})

// ⚠️ Never return apiKey or apiSecret in any query
const SAFE_EXCHANGE_SELECT = {
  id:           true,
  label:        true,
  name:         true,
  positionMode: true,
  isActive:     true,
  createdAt:    true,
  // apiKey:    NEVER
  // apiSecret: NEVER
} as const

export async function getExchanges() {
  const { user } = await requireAuth()
  return prisma.exchange.findMany({
    where:  { userId: user.id },
    select: SAFE_EXCHANGE_SELECT,
  })
}

export async function createExchange(input: unknown) {
  const { user } = await requireAuth()
  const data = createExchangeSchema.parse(input)

  // ⚠️ Always encrypt before saving
  return prisma.exchange.create({
    data: {
      ...data,
      apiKey:    encrypt(data.apiKey),
      apiSecret: encrypt(data.apiSecret),
      userId:    user.id,
    },
    select: SAFE_EXCHANGE_SELECT,
  })
}

export async function updateExchange(exchangeId: string, input: unknown) {
  const { user } = await requireAuth()
  await assertExchangeOwnership(user.id, user.role, exchangeId)

  const data = createExchangeSchema.partial().omit({ apiKey: true, apiSecret: true }).parse(input)
  return prisma.exchange.update({
    where:  { id: exchangeId },
    data,
    select: SAFE_EXCHANGE_SELECT,
  })
}

export async function deleteExchange(exchangeId: string) {
  const { user } = await requireAuth()
  await assertExchangeOwnership(user.id, user.role, exchangeId)

  const activeBots = await prisma.bot.count({
    where: { exchangeId, status: 'ACTIVE' },
  })
  if (activeBots > 0) throw new Error('Deactivate all bots using this exchange first.')

  return prisma.exchange.delete({ where: { id: exchangeId } })
}

export async function toggleExchange(exchangeId: string, isActive: boolean) {
  const { user } = await requireAuth()
  await assertExchangeOwnership(user.id, user.role, exchangeId)
  return prisma.exchange.update({
    where:  { id: exchangeId },
    data:   { isActive },
    select: SAFE_EXCHANGE_SELECT,
  })
}
```

---

### `actions/signals.ts`
```typescript
'use server'
import { requireAuth, assertBotOwnership } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function getSignalHistory(botId: string, limit = 50) {
  const { user } = await requireAuth()
  await assertBotOwnership(user.id, user.role, botId)

  return prisma.signal.findMany({
    where:   { botId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select: {
      id:           true,
      action:       true,
      symbol:       true,
      status:       true,
      errorMessage: true,
      processedAt:  true,
      createdAt:    true,
      positionId:   true,
    }
  })
}
```

---

### `actions/users.ts` (Admin only)
```typescript
'use server'
import { requireRole } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function getAllUsers() {
  await requireRole('ADMIN')
  return prisma.user.findMany({
    select: {
      id:        true,
      email:     true,
      name:      true,
      role:      true,
      agentId:   true,
      createdAt: true,
      _count:    { select: { bots: true, positions: true } }
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function assignCustomerToAgent(customerId: string, agentId: string | null) {
  await requireRole('ADMIN')
  return prisma.user.update({
    where: { id: customerId },
    data:  { agentId },
    select: { id: true, email: true, agentId: true },
  })
}

export async function updateUserRole(userId: string, role: 'ADMIN' | 'AGENT' | 'CUSTOMER') {
  await requireRole('ADMIN')
  return prisma.user.update({
    where:  { id: userId },
    data:   { role },
    select: { id: true, email: true, role: true },
  })
}
```

---

## Error Handling in Actions

Server Actions throw errors — Next.js surfaces them automatically. Wrap in `try/catch` at the call site.

```tsx
// In a component using a server action via React Query mutation
const { mutate: createBot } = useMutation({
  mutationFn: (data) => createBotAction(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bots'] })
    toast.success('Bot created!')
  },
  onError: (err: Error) => {
    toast.error(err.message)
  },
})
```

See `docs/10-error-handling.md` for full error handling patterns.
