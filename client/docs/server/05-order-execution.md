# 05 — Order Execution

## Golden Rule
**Every Binance API call must be wrapped in try/catch. On error, save to `Order.errorMessage`. Never fail silently.**

---

## Order Purpose → Binance API Mapping

| Purpose | Signal Action | Binance Side | Binance API |
|---------|--------------|-------------|------------|
| ENTRY | ENTER_LONG | BUY | `POST /api/v3/order` (spot) or `/sapi/v1/margin/order` |
| ENTRY | ENTER_SHORT | SELL | Margin only — borrow asset then sell |
| EXIT | EXIT_LONG | SELL | Same as ENTRY but opposite side |
| EXIT | EXIT_SHORT | BUY | Buy back the borrowed asset |
| STOP_LOSS | Auto | Opposite of entry | Part of OCO or standalone STOP_LOSS_LIMIT |
| TAKE_PROFIT | Auto | Opposite of entry | Part of OCO or TAKE_PROFIT_LIMIT |

---

## Placing Entry Orders

### SPOT Entry
```typescript
// lib/binance/spot.ts
export async function placeSpotMarketOrder({
  symbol, side, quantity, exchange
}: SpotOrderParams) {
  const client = getBinanceClient(exchange)

  try {
    const response = await client.order({
      symbol,
      side,              // 'BUY' or 'SELL'
      type:   'MARKET',
      quantity: quantity.toString(),
    })
    return response
  } catch (error) {
    // Log to Order.errorMessage — caller handles DB write
    throw new BinanceOrderError(error.message, error.code)
  }
}
```

### MARGIN Entry
```typescript
// lib/binance/margin.ts
export async function placeMarginMarketOrder({
  symbol, side, quantity, sideEffectType, exchange
}: MarginOrderParams) {
  const client = getBinanceClient(exchange)

  try {
    const response = await client.marginOrder({
      symbol,
      side,
      type:           'MARKET',
      quantity:       quantity.toString(),
      sideEffectType,  // 'MARGIN_BUY' | 'AUTO_REPAY' | 'NO_SIDE_EFFECT'
    })
    return response
  } catch (error) {
    throw new BinanceOrderError(error.message, error.code)
  }
}
```

### When to use MARGIN_BUY
```typescript
// Check if user has enough free balance
const marginAccount = await prisma.marginAccount.findFirst({
  where: { exchangeId: exchange.id, marginType: bot.marginType }
})

const freeUsdt = marginAccount.borrowedAssets.find(a => a.asset === 'USDT')?.free ?? 0
const needsAmount = bot.tradeAmountUsdt

const sideEffectType = freeUsdt < needsAmount ? 'MARGIN_BUY' : 'NO_SIDE_EFFECT'
```

---

## Placing Protective Orders

After every successful ENTRY order, place protective orders if the bot is configured for them.

### OCO Order (preferred — SL + TP in one call)
```typescript
// Use when bot.useOco === true
export async function placeOcoOrder({
  symbol, side, quantity, stopPrice, takeProfitPrice, exchange
}: OcoParams) {
  try {
    const response = await client.orderOco({
      symbol,
      side,                         // opposite of entry side
      quantity:      quantity.toString(),
      price:         takeProfitPrice.toString(),   // TP limit price
      stopPrice:     stopPrice.toString(),         // SL trigger price
      stopLimitPrice: (stopPrice * 0.999).toString(), // SL limit (0.1% below trigger)
      stopLimitTimeInForce: 'GTC',
    })

    // Save both order IDs to Position
    await prisma.position.update({
      where: { id: positionId },
      data: {
        ocoOrderId:       response.orderListId.toString(),
        stopLossOrderId:  response.orders[0].orderId.toString(),
        takeProfitOrderId: response.orders[1].orderId.toString(),
      }
    })

    return response
  } catch (error) {
    // Protective order failed — position is still open but unprotected
    // Log error but don't crash — position must still be tracked
    await prisma.order.create({
      data: {
        positionId,
        purpose:      'STOP_LOSS',
        status:       'ERROR',
        errorMessage: error.message,
        // ... other fields
      }
    })
    // Notify user via system (TODO: notification system)
    console.error('OCO order failed:', error)
  }
}
```

### Calculating SL/TP Prices
```typescript
export function calculateProtectivePrices(
  side: 'LONG' | 'SHORT',
  entryPrice: number,
  slPercent: number,
  tpPercent: number
) {
  if (side === 'LONG') {
    return {
      stopLoss:   entryPrice * (1 - slPercent / 100),
      takeProfit: entryPrice * (1 + tpPercent / 100),
      closeSide:  'SELL'
    }
  } else {
    return {
      stopLoss:   entryPrice * (1 + slPercent / 100),
      takeProfit: entryPrice * (1 - tpPercent / 100),
      closeSide:  'BUY'
    }
  }
}

// Example: LONG at 65,000 | SL 2% | TP 4%
// stopLoss   = 65,000 * 0.98 = 63,700
// takeProfit = 65,000 * 1.04 = 67,600
```

---

## Saving Every Order to DB

**Every Binance call (success or fail) must create an Order record.**

```typescript
// Template for saving any order
async function saveOrder(data: {
  positionId: string
  binanceOrderId?: string
  symbol: string
  side: string
  type: OrderType
  purpose: OrderPurpose
  sideEffect: SideEffectType
  quantity: Decimal
  price?: Decimal
  status: OrderStatus
  errorMessage?: string
  rawResponse?: object
}) {
  return prisma.order.create({ data })
}
```

---

## Error Codes to Handle

| Binance Error Code | Meaning | Action |
|-------------------|---------|--------|
| -1013 | Invalid quantity | Log + skip, notify user |
| -1100 | Bad parameter | Log + skip |
| -2010 | Insufficient balance | Log, set riskLevel = WARNING |
| -2015 | Invalid API key | Log, disable exchange |
| -3045 | Margin account has no balance | Log, check borrow availability |
| -1003 | Rate limit exceeded | Backoff + retry after delay |
