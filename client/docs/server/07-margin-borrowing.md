# 07 — Margin & Borrowing

## Key Concepts

| Term | Meaning |
|------|---------|
| Cross Margin | All assets share one margin pool. Lower liquidation risk but losses affect all assets. |
| Isolated Margin | Each trading pair has its own margin. Loss is isolated to that pair. |
| MARGIN_BUY | Binance sideEffect that auto-borrows what you need before buying |
| AUTO_REPAY | Binance sideEffect that auto-repays borrowed amount after selling |
| Margin Level | Binance ratio: Total Assets / Total Debt. Higher = safer. Below 1.1 = liquidation. |

---

## SPOT vs MARGIN: When to Use What

```
Bot.tradeType === 'SPOT'
  → Standard buy/sell
  → Cannot go SHORT
  → No borrowing, no leverage
  → sideEffect: NO_SIDE_EFFECT always

Bot.tradeType === 'MARGIN'
  → Can go LONG or SHORT
  → May borrow to amplify position
  → sideEffect: MARGIN_BUY (entering) or AUTO_REPAY (exiting)
  → Uses /sapi/v1/margin/order endpoint
```

---

## Borrowing Decision Logic

Before placing a margin entry order, determine if borrowing is needed:

```typescript
export async function determineSideEffect(
  exchangeId: string,
  marginType: 'CROSS' | 'ISOLATED',
  symbol: string,
  requiredUsdt: number
): Promise<SideEffectType> {

  const marginAccount = await prisma.marginAccount.findFirst({
    where: { exchangeId, marginType, symbol: marginType === 'ISOLATED' ? symbol : null },
    include: { borrowedAssets: true }
  })

  if (!marginAccount) throw new Error('Margin account not found')

  const usdtAsset = marginAccount.borrowedAssets.find(a => a.asset === 'USDT')
  const freeUsdt  = Number(usdtAsset?.free ?? 0)

  if (freeUsdt >= requiredUsdt) {
    return 'NO_SIDE_EFFECT'   // Have enough free balance
  } else {
    return 'MARGIN_BUY'       // Need to borrow
  }
}
```

---

## SHORT Position Mechanics (Margin Only)

Going SHORT means: **borrow the asset, sell it, buy it back later at lower price, repay**.

```
ENTER_SHORT (BTCUSDT):
  1. Bot wants to short BTC
  2. Binance borrows BTC from margin pool (MARGIN_BUY on SELL side)
  3. BTC is sold for USDT at market price
  4. Position opened: SHORT, quantity = BTC sold

EXIT_SHORT (BTCUSDT):
  1. Buy BTC back at current price (hopefully lower)
  2. Binance auto-repays the borrowed BTC (AUTO_REPAY on BUY side)
  3. USDT difference = profit (if price dropped) or loss (if price rose)
```

In Binance API terms:
```typescript
// ENTER_SHORT
{ side: 'SELL', sideEffectType: 'MARGIN_BUY' }

// EXIT_SHORT
{ side: 'BUY', sideEffectType: 'AUTO_REPAY' }
```

---

## Syncing MarginAccount from Binance

Run this sync on a schedule (every 5 minutes) and after every trade:

```typescript
export async function syncMarginAccount(
  exchangeId: string,
  exchange: Exchange,
  marginType: 'CROSS' | 'ISOLATED',
  symbol?: string
) {
  const client = getBinanceClient(exchange)

  try {
    const accountInfo = marginType === 'CROSS'
      ? await client.marginAccountInfo()
      : await client.isolatedMarginAccountInfo({ symbols: symbol })

    const marginLevel  = parseFloat(accountInfo.marginLevel)
    const riskLevel    = classifyRisk(marginLevel)

    await prisma.$transaction(async (tx) => {
      const marginAccount = await tx.marginAccount.upsert({
        where:  { exchangeId_marginType_symbol: { exchangeId, marginType, symbol: symbol ?? null } },
        create: { exchangeId, marginType, symbol: symbol ?? null, marginLevel, riskLevel },
        update: { marginLevel, riskLevel, lastSyncAt: new Date() }
      })

      // Sync borrowed assets
      for (const asset of accountInfo.userAssets) {
        await tx.borrowedAsset.upsert({
          where:  { marginAccountId_asset: { marginAccountId: marginAccount.id, asset: asset.asset } },
          create: {
            marginAccountId: marginAccount.id,
            asset:    asset.asset,
            borrowed: asset.borrowed,
            interest: asset.interest,
            free:     asset.free,
            locked:   asset.locked,
            netAsset: asset.netAsset,
          },
          update: {
            borrowed: asset.borrowed,
            interest: asset.interest,
            free:     asset.free,
            locked:   asset.locked,
            netAsset: asset.netAsset,
          }
        })
      }
    })

  } catch (error) {
    console.error('Margin sync failed:', error)
    // Don't throw — sync failure should not crash trades
  }
}

function classifyRisk(marginLevel: number): RiskLevel {
  if (marginLevel >= 2.0) return 'SAFE'
  if (marginLevel >= 1.5) return 'WARNING'
  return 'DANGER'
}
```

---

## Interest Accrual Tracking

Binance accrues interest hourly on borrowed assets. Our sync job captures this.

The `BorrowedAsset.interest` field always reflects the latest accrued but unpaid interest. When a position is closed with AUTO_REPAY, Binance deducts principal + interest automatically. After close, re-sync the margin account to get updated values.
