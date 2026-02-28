# 08 — Risk Management

## ⛔ Hard Rule
**Never execute a margin trade if riskLevel === 'DANGER'.**

This check must happen BEFORE every margin order. No exceptions.

---

## Risk Levels

| Level | Margin Level (Binance) | Action |
|-------|----------------------|--------|
| SAFE | ≥ 2.0 | Trades allowed normally |
| WARNING | 1.5 – 1.99 | Trades allowed but UI shows warning |
| DANGER | < 1.5 | **Block all new trades. Alert user.** |

Binance liquidates at margin level ≈ 1.1. We block at < 1.5 to give buffer.

---

## Pre-Trade Risk Checker

Always call this before any margin entry:

```typescript
// lib/trading/risk-checker.ts

export class RiskCheckerError extends Error {
  constructor(message: string, public riskLevel: RiskLevel) {
    super(message)
  }
}

export async function assertMarginSafe(
  exchangeId: string,
  marginType: 'CROSS' | 'ISOLATED',
  symbol?: string
): Promise<void> {

  const marginAccount = await prisma.marginAccount.findFirst({
    where: {
      exchangeId,
      marginType,
      symbol: marginType === 'ISOLATED' ? symbol : null
    }
  })

  if (!marginAccount) {
    throw new RiskCheckerError('Margin account not found', 'DANGER')
  }

  if (marginAccount.riskLevel === 'DANGER') {
    throw new RiskCheckerError(
      `Trade blocked: Margin account is in DANGER state (marginLevel: ${marginAccount.marginLevel}). ` +
      `Please reduce debt or add collateral before trading.`,
      'DANGER'
    )
  }

  // Also re-sync from Binance if data is stale (> 2 min old)
  const isStale = !marginAccount.lastSyncAt ||
    (Date.now() - marginAccount.lastSyncAt.getTime()) > 2 * 60 * 1000

  if (isStale) {
    // Sync in background — don't block the trade for fresh SAFE accounts
    syncMarginAccount(exchangeId, marginType, symbol).catch(console.error)
  }
}
```

### Usage in signal processor
```typescript
// In processSignal(), before placing any margin order:
if (bot.tradeType === 'MARGIN') {
  try {
    await assertMarginSafe(bot.exchange.id, bot.marginType!, signal.symbol)
  } catch (err) {
    if (err instanceof RiskCheckerError) {
      await prisma.signal.update({
        where: { id: signal.id },
        data: {
          status:       'SKIPPED',
          errorMessage: err.message,
        }
      })
      return { action: 'SKIPPED', reason: err.message }
    }
    throw err
  }
}
```

---

## Risk Level Classification Rules

```typescript
export function classifyRisk(marginLevel: number | null): RiskLevel {
  if (!marginLevel) return 'DANGER'    // Unknown = treat as dangerous
  if (marginLevel >= 2.0) return 'SAFE'
  if (marginLevel >= 1.5) return 'WARNING'
  return 'DANGER'
}
```

---

## UI Risk Indicators

When building risk-related UI, use these visual mappings:

| Risk Level | Color | Badge Variant | Action for User |
|-----------|-------|--------------|----------------|
| SAFE | Green | success | Normal trading |
| WARNING | Yellow | warning | Reduce exposure tooltip |
| DANGER | Red | destructive | Disable trade buttons + banner |

In the UI, when `riskLevel === 'DANGER'`:
- Disable all "Enter Position" buttons for this exchange's bots
- Show a full-width red banner with liquidation risk message
- Show current margin level and liquidation price

---

## Liquidation Detection (via WebSocket)

When a position is liquidated by Binance, we receive an order fill event for a position we didn't close. Detect this:

```typescript
// In WebSocket listener
if (
  orderUpdate.executionType === 'TRADE' &&
  orderUpdate.orderStatus === 'FILLED' &&
  isLiquidationOrder(orderUpdate)   // Binance marks these with specific flags
) {
  await prisma.position.updateMany({
    where: {
      symbol: orderUpdate.symbol,
      status: 'OPEN',
      // Match by exchange
    },
    data: {
      status:   'LIQUIDATED',
      closedAt: new Date(),
      exitPrice: orderUpdate.lastExecutedPrice,
    }
  })

  // Recalculate realized loss
  // Sync margin account immediately
  await syncMarginAccount(...)
}
```
