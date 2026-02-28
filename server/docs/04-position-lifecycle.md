# 04 — Position Lifecycle

## Core Rule
**One Bot = One Open Position at a time.**

This is enforced in application code, not the database. Always query for an open position before processing any signal.

---

## Signal → Action Decision Table

| Open Position | Signal Received | Action | Reason |
|---|---|---|---|
| None | ENTER_LONG | ✅ Open LONG | Normal entry |
| None | ENTER_SHORT | ✅ Open SHORT | Normal entry (MARGIN only) |
| None | EXIT_LONG | ⚠️ SKIP | Nothing to close |
| None | EXIT_SHORT | ⚠️ SKIP | Nothing to close |
| LONG | ENTER_LONG | ⚠️ SKIP | Already in this position |
| LONG | EXIT_LONG | ✅ Close LONG | Correct exit signal |
| LONG | ENTER_SHORT | ⚠️ SKIP | Strict mode — must EXIT first |
| LONG | EXIT_SHORT | ⚠️ SKIP | Wrong side |
| SHORT | ENTER_SHORT | ⚠️ SKIP | Already in this position |
| SHORT | EXIT_SHORT | ✅ Close SHORT | Correct exit signal |
| SHORT | ENTER_LONG | ⚠️ SKIP | Strict mode — must EXIT first |
| SHORT | EXIT_LONG | ⚠️ SKIP | Wrong side |

**Strict Mode is the default.** Do not implement Flip Mode unless explicitly requested.

---

## Opening a Position (ENTER_LONG / ENTER_SHORT)

### 1. Pre-trade checks
```typescript
// a) One position per bot
const existing = await prisma.position.findFirst({
  where: { botId: bot.id, status: 'OPEN' }
})
if (existing) return { action: 'SKIPPED', reason: 'Position already open' }

// b) Risk check (MARGIN only)
if (bot.tradeType === 'MARGIN') {
  await riskChecker.assertSafe(bot.exchangeId, signal.symbol)
  // throws if riskLevel === DANGER
}
```

### 2. Calculate order size
```typescript
const ticker   = await binance.getPrice(signal.symbol)        // current market price
const quantity = bot.tradeAmountUsdt / ticker.price           // how many units to buy

// For margin: notional = amount * leverage
const notional = bot.tradeAmountUsdt * bot.leverage
```

### 3. Place entry order on Binance
```typescript
// Determine Binance side
const binanceSide = signal.action === 'ENTER_LONG' ? 'BUY' : 'SELL'

const binanceOrder = await binance.placeOrder({
  symbol:        signal.symbol,
  side:          binanceSide,
  type:          'MARKET',
  quantity:      quantity,
  sideEffectType: needsBorrow ? 'MARGIN_BUY' : 'NO_SIDE_EFFECT'
})
```

### 4. Create Position + Order in DB (single transaction)
```typescript
const result = await prisma.$transaction(async (tx) => {
  const position = await tx.position.create({
    data: {
      userId:       bot.userId,
      botId:        bot.id,
      symbol:       signal.symbol,
      side:         signal.action === 'ENTER_LONG' ? 'LONG' : 'SHORT',
      tradeType:    bot.tradeType,
      marginType:   bot.marginType ?? null,
      leverage:     bot.leverage,
      quantity:     quantity,
      entryPrice:   binanceOrder.fills[0]?.price ?? null,  // filled by WS later
      notionalUsdt: notional,
      status:       'OPEN',
    }
  })

  const order = await tx.order.create({
    data: {
      positionId:     position.id,
      binanceOrderId: binanceOrder.orderId,
      symbol:         signal.symbol,
      side:           binanceSide,
      type:           'MARKET',
      purpose:        'ENTRY',
      sideEffect:     needsBorrow ? 'MARGIN_BUY' : 'NO_SIDE_EFFECT',
      quantity:       quantity,
      status:         'PENDING',
      rawResponse:    binanceOrder,
    }
  })

  return { position, order }
})
```

### 5. Place protective orders (if configured)
```typescript
if (bot.stopLossPercent || bot.takeProfitPercent) {
  await placeProtectiveOrders(result.position, bot, entryPrice)
}
```
See `docs/05-order-execution.md` for protective order logic.

### 6. Update Signal with positionId
```typescript
await prisma.signal.update({
  where: { id: signal.id },
  data:  { positionId: result.position.id, status: 'PROCESSED' }
})
```

---

## Closing a Position (EXIT_LONG / EXIT_SHORT)

### 1. Find the open position
```typescript
const position = await prisma.position.findFirst({
  where: { botId: bot.id, symbol: signal.symbol, status: 'OPEN' }
})
if (!position) return { action: 'SKIPPED', reason: 'No open position' }
```

### 2. Verify signal matches position side
```typescript
const isCorrectExit =
  (position.side === 'LONG'  && signal.action === 'EXIT_LONG') ||
  (position.side === 'SHORT' && signal.action === 'EXIT_SHORT')

if (!isCorrectExit) return { action: 'SKIPPED', reason: 'Signal side mismatch' }
```

### 3. Cancel existing SL/TP orders on Binance
```typescript
// Must cancel before placing close order to avoid double fills
if (position.ocoOrderId) {
  await binance.cancelOcoOrder(signal.symbol, position.ocoOrderId)
}
if (position.stopLossOrderId) {
  await binance.cancelOrder(signal.symbol, position.stopLossOrderId)
}
```

### 4. Place close order
```typescript
const closeSide = position.side === 'LONG' ? 'SELL' : 'BUY'

const closeOrder = await binance.placeOrder({
  symbol:         signal.symbol,
  side:           closeSide,
  type:           'MARKET',
  quantity:       position.quantity,
  sideEffectType: bot.tradeType === 'MARGIN' ? 'AUTO_REPAY' : 'NO_SIDE_EFFECT'
})
```

### 5. Calculate P&L and close position (single transaction)
```typescript
const exitPrice  = closeOrder.fills[0]?.price
const pnl        = calculatePnl(position, exitPrice)  // see docs/06-pnl-calculation.md

await prisma.$transaction(async (tx) => {
  // Close the position
  await tx.position.update({
    where: { id: position.id },
    data: {
      exitPrice:   exitPrice,
      realizedPnl: pnl.realized,
      pnlPercent:  pnl.percent,
      status:      'CLOSED',
      closedAt:    new Date(),
    }
  })

  // Log the exit order
  await tx.order.create({
    data: {
      positionId:     position.id,
      binanceOrderId: closeOrder.orderId,
      symbol:         signal.symbol,
      side:           closeSide,
      type:           'MARKET',
      purpose:        'EXIT',
      sideEffect:     bot.tradeType === 'MARGIN' ? 'AUTO_REPAY' : 'NO_SIDE_EFFECT',
      quantity:       position.quantity,
      avgFillPrice:   exitPrice,
      status:         'FILLED',
      rawResponse:    closeOrder,
    }
  })

  // Update portfolio stats
  await updatePortfolio(tx, position.userId, pnl)
})
```

---

## Position Status Transitions

```
OPEN
  ↓ (EXIT signal or SL/TP hit)
CLOSED

OPEN
  ↓ (partial fill — rare)
PARTIALLY_CLOSED
  ↓
CLOSED

OPEN
  ↓ (margin level hits liquidation)
LIQUIDATED
```

Liquidated positions are detected via WebSocket (order fill on a position we didn't exit). Mark as LIQUIDATED and alert the user.
