# 06 — P&L Calculation

## Core Formulas

### LONG Position P&L
```
realizedPnl = (exitPrice - entryPrice) × quantity − totalFees
pnlPercent  = (realizedPnl / (entryPrice × quantity)) × 100
```

### SHORT Position P&L
```
realizedPnl = (entryPrice - exitPrice) × quantity − totalFees
pnlPercent  = (realizedPnl / (entryPrice × quantity)) × 100
```

### With Leverage (Margin)
```
// notional = full position size in USDT
notionalUsdt = entryPrice × quantity

// actualCapital = what user put in (collateral)
actualCapital = notionalUsdt / leverage

// pnlOnCapital = % return on the capital used
pnlOnCapital = (realizedPnl / actualCapital) × 100
```

---

## TypeScript Implementation

```typescript
// lib/trading/pnl-calculator.ts

import { Decimal } from '@prisma/client/runtime/library'

interface PnlResult {
  realized:       Decimal
  percent:        Decimal       // % of notional
  percentOnCapital: Decimal    // % of actual capital (with leverage)
}

export function calculatePnl(
  position: {
    side:        'LONG' | 'SHORT'
    entryPrice:  Decimal
    quantity:    Decimal
    leverage:    number
    fee:         Decimal        // total entry fees
  },
  exitPrice:   Decimal,
  exitFee:     Decimal          // exit order fee
): PnlResult {

  const entry   = Number(position.entryPrice)
  const exit    = Number(exitPrice)
  const qty     = Number(position.quantity)
  const fees    = Number(position.fee) + Number(exitFee)

  const grossPnl = position.side === 'LONG'
    ? (exit - entry) * qty
    : (entry - exit) * qty

  const realized = grossPnl - fees
  const notional = entry * qty
  const capital  = notional / position.leverage

  return {
    realized:          new Decimal(realized.toFixed(8)),
    percent:           new Decimal(((realized / notional) * 100).toFixed(4)),
    percentOnCapital:  new Decimal(((realized / capital) * 100).toFixed(4)),
  }
}
```

---

## Updating Portfolio After Close

Every time a position closes, update the Portfolio model. Do this inside the same Prisma transaction as the position close.

```typescript
// lib/trading/portfolio-updater.ts

export async function updatePortfolio(
  tx: PrismaTransactionClient,
  userId: string,
  pnl: PnlResult,
  isWin: boolean   // realizedPnl > 0
) {
  const portfolio = await tx.portfolio.findUnique({ where: { userId } })

  const newTotalTrades   = portfolio.totalTrades + 1
  const newWinningTrades = portfolio.winningTrades + (isWin ? 1 : 0)
  const newLosingTrades  = portfolio.losingTrades  + (isWin ? 0 : 1)

  await tx.portfolio.update({
    where: { userId },
    data: {
      totalPnl:      { increment: pnl.realized },
      totalTrades:   newTotalTrades,
      winningTrades: newWinningTrades,
      losingTrades:  newLosingTrades,
      winRate: new Decimal(
        ((newWinningTrades / newTotalTrades) * 100).toFixed(2)
      ),
      // Daily/weekly P&L updated by separate aggregation job
    }
  })
}
```

---

## Unrealized P&L (Live, for Open Positions)

Unrealized P&L is **not stored in the DB** — it is calculated on the fly from the live price.

```typescript
// Called by the WebSocket price feed or on-demand
export function calculateUnrealizedPnl(
  position: { side: 'LONG'|'SHORT', entryPrice: Decimal, quantity: Decimal, leverage: number },
  currentPrice: number
): number {
  const entry = Number(position.entryPrice)
  const qty   = Number(position.quantity)

  return position.side === 'LONG'
    ? (currentPrice - entry) * qty
    : (entry - currentPrice) * qty
}
```

Update `Position.unrealizedPnl` periodically (e.g., every WebSocket price tick for open positions).

---

## Daily/Weekly P&L Aggregation

Run as a cron job or on-demand, NOT on every trade:

```typescript
// Aggregate closed positions for the day
const dailyPnl = await prisma.position.aggregate({
  where: {
    userId,
    status:   'CLOSED',
    closedAt: { gte: startOfDay() }
  },
  _sum: { realizedPnl: true }
})

await prisma.portfolio.update({
  where: { userId },
  data: { dailyPnl: dailyPnl._sum.realizedPnl ?? 0 }
})
```

---

## Fee Tracking

Fees come from Binance order fill responses. Always capture them:

```typescript
// From Binance order response
const totalFee = order.fills.reduce((sum, fill) => {
  // Convert fee to USDT if paid in BNB or other asset
  return sum + parseFloat(fill.commission)
}, 0)

// Save to Order
await prisma.order.update({
  where: { id: dbOrder.id },
  data: {
    fee:     new Decimal(totalFee),
    feeAsset: order.fills[0]?.commissionAsset
  }
})

// Also accumulate in Position
await prisma.position.update({
  where: { id: position.id },
  data: { fee: { increment: new Decimal(totalFee) } }
})
```
