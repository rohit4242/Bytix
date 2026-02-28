# 05 — Prisma in client/

## What client/ Uses Prisma For

`client/` uses Prisma **for reads and simple CRUD only**. It never writes to Signal, Position, Order, Portfolio, MarginAccount, or BorrowedAsset — those are owned by `server/`.

---

## What client/ Can Read vs Write

| Model | client/ Can Read | client/ Can Write |
|-------|-----------------|------------------|
| User | ✅ | ✅ (profile only) |
| Session / Account | ✅ | Better Auth manages |
| Exchange | ✅ (no apiKey/apiSecret) | ✅ (create/delete/toggle) |
| Bot | ✅ | ✅ (config CRUD) |
| Signal | ✅ | ❌ |
| Position | ✅ | ❌ |
| Order | ✅ | ❌ |
| Portfolio | ✅ | ❌ |
| MarginAccount | ✅ | ❌ |
| BorrowedAsset | ✅ | ❌ |
| BalanceSnapshot | ✅ | ❌ |
| Transaction | ✅ | ❌ |

---

## Critical Prisma Rules in client/

### 1. Never Select apiKey or apiSecret
```typescript
// ❌ WRONG — exposes encrypted keys
const exchange = await prisma.exchange.findUnique({ where: { id } })

// ✅ CORRECT — always use explicit select
const exchange = await prisma.exchange.findUnique({
  where:  { id },
  select: { id: true, label: true, name: true, isActive: true, positionMode: true }
})
```

Create a reusable safe select constant:
```typescript
// client/lib/prisma-selects.ts
export const SAFE_EXCHANGE_SELECT = {
  id:           true,
  label:        true,
  name:         true,
  positionMode: true,
  isActive:     true,
  createdAt:    true,
} as const

export const POSITION_LIST_SELECT = {
  id:           true,
  symbol:       true,
  side:         true,
  tradeType:    true,
  status:       true,
  entryPrice:   true,
  exitPrice:    true,
  quantity:     true,
  realizedPnl:  true,
  unrealizedPnl: true,
  pnlPercent:   true,
  leverage:     true,
  openedAt:     true,
  closedAt:     true,
  bot:          { select: { name: true } },
} as const

export const BOT_LIST_SELECT = {
  id:               true,
  name:             true,
  status:           true,
  tradeType:        true,
  pairs:            true,
  tradeAmountUsdt:  true,
  leverage:         true,
  webhookSecret:    true,  // Shown in bot settings for TradingView config
  createdAt:        true,
  exchange:         { select: { label: true, name: true, isActive: true } },
} as const
```

### 2. Always Filter by userId (Role-Aware)
```typescript
// ✅ Always scope to the authenticated user
const positions = await prisma.position.findMany({
  where: { userId: session.user.id }
})

// ✅ AGENT — scope to their customers
const positions = await prisma.position.findMany({
  where: {
    user: { agentId: session.user.id }
  }
})
```

### 3. Use Decimal Correctly in Queries
```typescript
import { Decimal } from '@prisma/client/runtime/library'

// Filtering by Decimal value
const positions = await prisma.position.findMany({
  where: {
    userId:     user.id,
    realizedPnl: { gt: new Decimal(0) }  // Winning trades only
  }
})
```

### 4. Pagination for Long Lists
```typescript
export async function getPositions(page = 1, pageSize = 20) {
  const { user } = await requireAuth()
  const skip = (page - 1) * pageSize

  const [positions, total] = await prisma.$transaction([
    prisma.position.findMany({
      where:   { userId: user.id },
      orderBy: { openedAt: 'desc' },
      skip,
      take:    pageSize,
    }),
    prisma.position.count({ where: { userId: user.id } }),
  ])

  return { positions, total, pages: Math.ceil(total / pageSize) }
}
```

### 5. Include Only What You Need
```typescript
// ✅ Only include nested data when the UI needs it
const bot = await prisma.bot.findUnique({
  where:   { id: botId },
  include: {
    exchange: { select: { label: true, isActive: true } },
    // Don't include positions here — too much data
  }
})

// Fetch positions separately when needed
const recentSignals = await prisma.signal.findMany({
  where:   { botId, status: 'PROCESSED' },
  orderBy: { createdAt: 'desc' },
  take:    10,
})
```

---

## Common Queries Reference

```typescript
// Open positions for dashboard
prisma.position.findMany({
  where:   { userId, status: 'OPEN' },
  orderBy: { openedAt: 'desc' },
})

// Closed positions with P&L (for history table)
prisma.position.findMany({
  where:   { userId, status: 'CLOSED' },
  orderBy: { closedAt: 'desc' },
  take:    50,
  select:  POSITION_LIST_SELECT,
})

// Bot with signal count
prisma.bot.findMany({
  where:   { userId },
  include: {
    _count:   { select: { signals: true, positions: true } },
    exchange: { select: { label: true } }
  }
})

// Balance snapshots for chart (last 30 days)
prisma.balanceSnapshot.findMany({
  where:   { userId, snapshotAt: { gte: thirtyDaysAgo } },
  orderBy: { snapshotAt: 'asc' },
  select:  { navUsd: true, netEquity: true, snapshotAt: true },
})

// Order history for a position
prisma.order.findMany({
  where:   { positionId },
  orderBy: { submittedAt: 'asc' },
  select: {
    purpose:       true,
    side:          true,
    type:          true,
    status:        true,
    quantity:      true,
    avgFillPrice:  true,
    fee:           true,
    errorMessage:  true,
    submittedAt:   true,
    filledAt:      true,
  }
})

// Margin account with assets (for risk display)
prisma.marginAccount.findMany({
  where:   { exchange: { userId } },
  include: { borrowedAssets: true },
})
```
