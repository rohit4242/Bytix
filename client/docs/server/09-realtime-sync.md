# 09 — Real-Time Sync & WebSockets

## Two Types of Streams

| Stream | Purpose | Binance Endpoint |
|--------|---------|-----------------|
| User Data Stream | Order fills, account updates | `wss://stream.binance.com/ws/<listenKey>` |
| Market Data Stream | Live prices for open positions | `wss://stream.binance.com/ws/<symbol>@aggTrade` |

---

## User Data Stream (Critical)

This is how we know when orders are filled, cancelled, or rejected. **Must always be running for every active exchange.**

### Setup

```typescript
// lib/binance/websocket.ts

export class BinanceUserDataStream {
  private ws: WebSocket | null = null
  private listenKey: string = ''
  private keepAliveInterval: NodeJS.Timeout | null = null

  async start(exchange: Exchange) {
    // 1. Get listen key from Binance
    this.listenKey = await this.createListenKey(exchange)

    // 2. Connect WebSocket
    this.ws = new WebSocket(
      `${process.env.BINANCE_WS_URL}/ws/${this.listenKey}`
    )

    this.ws.on('message', (data) => this.handleMessage(JSON.parse(data.toString())))
    this.ws.on('close', () => this.reconnect(exchange))
    this.ws.on('error', (err) => console.error('WS error:', err))

    // 3. Keep listen key alive (expires after 60 min without ping)
    this.keepAliveInterval = setInterval(
      () => this.pingListenKey(exchange),
      30 * 60 * 1000  // every 30 minutes
    )
  }

  private async handleMessage(event: BinanceStreamEvent) {
    switch (event.e) {
      case 'executionReport':
        await this.handleOrderUpdate(event)
        break
      case 'outboundAccountPosition':
        await this.handleBalanceUpdate(event)
        break
    }
  }
}
```

### Handling Order Updates

```typescript
private async handleOrderUpdate(event: BinanceOrderUpdateEvent) {
  // event.X = order status (NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED, EXPIRED)
  // event.i = binanceOrderId
  // event.l = last filled quantity
  // event.L = last filled price
  // event.n = commission (fee)
  // event.N = commission asset

  const order = await prisma.order.findFirst({
    where: { binanceOrderId: event.i.toString() },
    include: { position: true }
  })

  if (!order) {
    // Could be a manual order placed outside the bot
    console.warn('Order not found in DB:', event.i)
    return
  }

  const newStatus = mapBinanceStatus(event.X)   // FILLED, CANCELED, etc.

  await prisma.$transaction(async (tx) => {
    // Update the order
    await tx.order.update({
      where: { id: order.id },
      data: {
        status:        newStatus,
        filledQuantity: event.z,        // cumulative filled qty
        avgFillPrice:  event.ap,        // avg fill price
        fee:           event.n,
        feeAsset:      event.N,
        fillPercent:   (event.z / order.quantity) * 100,
        filledAt:      newStatus === 'FILLED' ? new Date() : null,
      }
    })

    // If this is an ENTRY order that just filled, update position entry price
    if (order.purpose === 'ENTRY' && newStatus === 'FILLED') {
      await tx.position.update({
        where: { id: order.positionId },
        data: { entryPrice: event.ap, isReconciled: true }
      })
    }

    // If this is an EXIT / SL / TP order that filled, close the position
    if (
      ['EXIT', 'STOP_LOSS', 'TAKE_PROFIT'].includes(order.purpose) &&
      newStatus === 'FILLED'
    ) {
      const pnl = calculatePnl(order.position, event.ap, event.n)

      await tx.position.update({
        where: { id: order.positionId },
        data: {
          exitPrice:   event.ap,
          realizedPnl: pnl.realized,
          pnlPercent:  pnl.percent,
          status:      'CLOSED',
          closedAt:    new Date(),
        }
      })

      await updatePortfolio(tx, order.position.userId, pnl, pnl.realized > 0)

      // Take a balance snapshot after close
      await takeBalanceSnapshot(tx, order.position.userId)
    }
  })
}
```

---

## Market Data Stream (Live Prices)

Only subscribe to symbols where the user has **open positions** or is actively viewing. Do NOT subscribe to all symbols.

```typescript
// Subscribe only to needed symbols
const openPositionSymbols = await prisma.position.findMany({
  where: { status: 'OPEN' },
  select: { symbol: true },
  distinct: ['symbol']
})

for (const { symbol } of openPositionSymbols) {
  subscribeToPrice(symbol.toLowerCase())
}

// Unsubscribe when position closes
function onPositionClose(symbol: string) {
  if (!hasOtherOpenPositionsFor(symbol)) {
    unsubscribeFromPrice(symbol)
  }
}
```

---

## Reconciliation Fallback (Cron Job)

WebSockets can disconnect. Run a reconciliation job every 15 minutes to catch missed fills:

```typescript
// Fetch all open positions
const openPositions = await prisma.position.findMany({
  where: { status: 'OPEN' },
  include: { orders: true, bot: { include: { exchange: true } } }
})

for (const position of openPositions) {
  // Check each pending/open order against Binance
  for (const order of position.orders) {
    if (!['FILLED', 'CANCELED'].includes(order.status)) {
      const binanceOrder = await binance.getOrder({
        symbol:  order.symbol,
        orderId: order.binanceOrderId
      })

      if (binanceOrder.status !== order.status) {
        // Status mismatch — sync it
        await syncOrderFromBinance(order, binanceOrder)
      }
    }
  }

  // Mark as reconciled
  await prisma.position.update({
    where: { id: position.id },
    data: { lastSyncAt: new Date(), isReconciled: true }
  })
}
```

---

## Balance Snapshots

Take a snapshot after every position close and on a daily schedule:

```typescript
export async function takeBalanceSnapshot(
  tx: PrismaTransactionClient,
  userId: string
) {
  const portfolio = await tx.portfolio.findUnique({ where: { userId } })

  await tx.balanceSnapshot.create({
    data: {
      userId,
      navUsd:    portfolio.totalBalance,
      netEquity: portfolio.totalBalance - portfolio.totalDebt,
      debtUsd:   portfolio.totalDebt,
      snapshotAt: new Date(),
    }
  })
}
```
