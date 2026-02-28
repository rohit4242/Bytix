# Bytix Server — Full Implementation Plan

Rebuild the `server/` Bun + Hono trading engine from scratch per the 12 docs. **The folder structure is kept, but all existing file contents are replaced** to align with the documented architecture.

> ⚠️ `server/prisma/schema.prisma` and `client/prisma/schema.prisma` must always be **identical**. After any schema change run `bunx prisma migrate dev` + `bunx prisma generate` in both projects.

> ⚠️ The existing code uses a different pattern (repositories, `bot.isActive`, different schema). All files will be rewritten. Folders stay, file contents are replaced.

---

## Phase 1 — Prisma Schema

### MODIFY: `prisma/schema.prisma`

Rewrite with the full schema from **doc 02**. The current schema has only `User`, `Session`, `Account`, `Verification` — we need to add all trading models.

**Add all enums:**
`Role`, `ExchangeName`, `MarginType`, `PositionMode`, `BotStatus`, `TradeSide`, `TradeType`, `SignalAction`, `SignalStatus`, `PositionStatus`, `OrderType`, `OrderPurpose`, `OrderStatus`, `SideEffectType`, `TransactionType`, `RiskLevel`

**Add all models:**
`Portfolio`, `BalanceSnapshot`, `Exchange`, `MarginAccount`, `BorrowedAsset`, `Bot`, `Signal`, `Position`, `Order`, `Transaction`

**Key schema rules:**
- Never use `Float` for financial data — always `Decimal @db.Decimal(20, 8)`
- Never add custom fields to `Session`, `Account`, `Verification`
- All models keep existing `Session/Account/Verification` unchanged (Better Auth manages them)
- Run `bunx prisma generate` after migration to regenerate `src/generated/prisma`

---

## Phase 2 — Core Library

### MODIFY: `src/lib/env.ts`

Zod-validated environment variable schema. All code imports env vars from here — never from `process.env` directly.

```ts
// Required vars:
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
ENCRYPTION_KEY,    // 32-byte hex
BINANCE_BASE_URL,  // https://api.binance.com
BINANCE_WS_URL,    // wss://stream.binance.com:9443
PORT,              // default 3001
NODE_ENV           // development | production
```

### MODIFY: `src/lib/db.ts`

Keep existing adapter-pg pattern but rename export to `db` (consistent throughout codebase):
```ts
export const db = new PrismaClient({ adapter })
```

### NEW: `src/lib/encryption.ts`

AES-256-GCM encrypt/decrypt. **Identical to `client/lib/encryption.ts`** (same `ENCRYPTION_KEY`).
- `encrypt(text: string): string` → `"iv:tag:encrypted"` hex format
- `decrypt(encryptedText: string): string`

### MODIFY: `src/lib/auth.ts`

Better Auth config (for session verification pattern). Used by the auth middleware to verify Bearer tokens against the shared `Session` DB table.

### NEW: `src/lib/ownership.ts`

- `assertPositionOwnership(user, position)` — ADMIN: all access, AGENT: assigned customers only, CUSTOMER: own only
- `ForbiddenError extends Error { status = 403 }`

---

## Phase 3 — Middleware

### MODIFY: `src/middleware/auth.ts`

Bearer token middleware (per doc 10):
```
1. Extract "Bearer <token>" from Authorization header
2. db.session.findUnique({ where: { token }, include: { user: true } })
3. Check expiresAt < new Date() → 401
4. c.set('user', session.user)  ← attaches to Hono context
```
Hono context Variables type: `user: { id, email, role, name, agentId }`

### MODIFY: `src/middleware/require-role.ts`

`requireRole(...roles)` — returns middleware that checks `c.get('user').role`.

### MODIFY: `src/middleware/error-handler.ts`

Global Hono `onError` handler. Handles `ForbiddenError` (403), generic errors (500).

---

## Phase 4 — Binance Client Layer

### MODIFY: `src/binance/client.ts`

`getBinanceClient(exchange: Exchange)` — decrypts `exchange.apiKey` and `exchange.apiSecret`, returns configured `@binance/spot` client. Cache clients by `exchangeId`.

### MODIFY: `src/binance/spot.ts`

- `placeSpotMarketOrder({ symbol, side, quantity, exchange })` → Binance response
- `cancelOrder({ symbol, orderId, exchange })`
- `getOrder({ symbol, orderId, exchange })`

All wrapped in try/catch — throw `BinanceOrderError` on failure.

### MODIFY: `src/binance/margin.ts`

- `placeMarginMarketOrder({ symbol, side, quantity, sideEffectType, exchange })`
- `placeOcoOrder({ symbol, side, quantity, stopPrice, takeProfitPrice, exchange })`
- `cancelOcoOrder({ symbol, orderListId, exchange })`
- `getMarginAccountInfo({ exchange, marginType, symbol? })`

### MODIFY: `src/binance/market.ts`

- `getPrice(symbol: string, exchange: Exchange): Promise<number>` — latest ticker price

### MODIFY: `src/binance/websocket.ts`

`BinanceUserDataStream` class:
- `start(exchange)` — create listenKey, connect WS, set 30-min keepAlive interval
- `handleMessage(event)` → `executionReport` → `handleOrderUpdate()` | `outboundAccountPosition` → `handleBalanceUpdate()`
- `handleOrderUpdate()` — match by `binanceOrderId`, update Order, update Position on fill, close position + update portfolio if EXIT/SL/TP filled
- `reconnect()` on close

`startWebSocketManager()` — on boot, find all active exchanges, start a stream for each.

### MODIFY: `src/binance/utils.ts`

- `mapBinanceStatus(binanceStatus: string): OrderStatus`
- `calculateProtectivePrices(side, entryPrice, slPercent, tpPercent)` → `{ stopLoss, takeProfit, closeSide }`

---

## Phase 5 — Core Trading Services

### NEW: `src/services/risk-checker.ts`

Per **doc 08**:
```ts
export async function assertMarginSafe(exchangeId, marginType, symbol?)
// throws RiskCheckerError if riskLevel === 'DANGER' or margin account not found
// also triggers background re-sync if data is stale (> 2 min)

export function classifyRisk(marginLevel: number | null): RiskLevel
// null → DANGER, >= 2.0 → SAFE, >= 1.5 → WARNING, < 1.5 → DANGER

class RiskCheckerError extends Error { riskLevel: RiskLevel }
```

### NEW: `src/services/pnl-calculator.ts`

Per **doc 06**:
```ts
calculatePnl(position, exitPrice, exitFee): PnlResult
// { realized: Decimal, percent: Decimal, percentOnCapital: Decimal }

calculateUnrealizedPnl(position, currentPrice): number
```

### NEW: `src/services/portfolio-updater.ts`

Per **docs 06, 09**:
```ts
updatePortfolio(tx, userId, pnl, isWin)
// increment totalPnl, totalTrades, winningTrades/losingTrades, recalculate winRate

takeBalanceSnapshot(tx, userId)
// reads portfolio, creates BalanceSnapshot record
```

### MODIFY: `src/services/margin-sync.ts`

Per **doc 07**:
```ts
syncMarginAccount(exchangeId, exchange, marginType, symbol?)
// Fetches from Binance, upserts MarginAccount, upserts all BorrowedAsset records

determineSideEffect(exchangeId, marginType, symbol, requiredUsdt): SideEffectType
// checks free USDT balance → NO_SIDE_EFFECT or MARGIN_BUY
```

---

## Phase 6 — Signal Processor & Position Manager

This is the **core of the trading engine**. Read **docs 03, 04, 05** carefully before implementing.

### MODIFY: `src/services/signal-processor.ts`

```ts
export async function processSignal(signal: Signal, bot: Bot & { exchange: Exchange })
```

Flow:
1. Check for existing open position (`db.position.findFirst({ where: { botId, status: 'OPEN' } })`)
2. Apply decision table → `openPosition()` | `closePosition()` | `{ action: 'SKIPPED', reason }`
3. Update signal status (PROCESSED | SKIPPED | FAILED)

**openPosition(signal, bot):**
1. Re-check no open position (atomically)
2. If MARGIN → `assertMarginSafe()`
3. Get price via `getPrice()`
4. Calculate `quantity = tradeAmountUsdt / price`
5. Determine `sideEffectType` via `determineSideEffect()`
6. Call `placeSpotMarketOrder()` or `placeMarginMarketOrder()`
7. Prisma `$transaction`: create `Position` + create `Order` (ENTRY)
8. If bot has SL/TP config → `placeProtectiveOrders()`
9. Update signal with `positionId`

**closePosition(signal, bot, openPosition):**
1. Verify side matches exit signal
2. Cancel SL/TP/OCO orders on Binance if any
3. Place exit MARKET order (AUTO_REPAY for MARGIN)
4. Calculate P&L
5. Prisma `$transaction`: update Position (CLOSED, exitPrice, realizedPnl), create EXIT Order, `updatePortfolio()`, `takeBalanceSnapshot()`
6. Trigger margin sync in background

---

## Phase 7 — Order Executor

### NEW: `src/services/order-executor.ts`

```ts
saveOrder(data: SaveOrderData): Promise<Order>
// Every Binance call creates one — success or failure

placeProtectiveOrders(position, bot, entryPrice)
// If bot.useOco → placeOcoOrder, save both order IDs to position
// Else → place individual STOP_LOSS + TAKE_PROFIT orders
// On failure: log error Order record, do NOT crash — position must still be tracked
```

---

## Phase 8 — Background Jobs

### MODIFY: `src/jobs/reconciliation.ts`

Per **doc 09**. Runs every 15 minutes:
- Find all OPEN positions with non-terminal orders
- For each order, call Binance `getOrder()` and compare status
- If mismatch → sync order status, close position if needed
- Mark `position.isReconciled = true`, update `lastSyncAt`

### MODIFY: `src/jobs/margin-sync.ts`

Runs every 5 minutes:
- Find all active exchanges with MARGIN bots
- Call `syncMarginAccount()` for each

### MODIFY: `src/jobs/balance-snapshot.ts`

Runs daily + after every position close:
- Call `takeBalanceSnapshot()` for all users with active portfolios

### MODIFY: `src/jobs/index.ts`

`startCronJobs()` — schedules all three jobs using `setInterval`.

---

## Phase 9 — Routes

### MODIFY: `src/routes/webhooks.ts`

`POST /webhooks/bot/:botId` — **NO auth middleware** (verified by `payload.secret`):
```
Parse body → validate bot → create Signal → idempotency lock → processSignal → always return 200
```
Full flow from **doc 03**.

### MODIFY: `src/routes/positions.ts`

`authMiddleware` on all routes:
- `POST /:positionId/close` — `assertPositionOwnership()` → `closePosition()`
- `GET /:positionId/sync` — force-sync position from Binance
- `POST /:positionId/force-close` — `requireRole('ADMIN')` → close any position

### MODIFY: `src/routes/margin.ts`

- `POST /:exchangeId/sync` — `authMiddleware` → `syncMarginAccount()`
- `GET /:exchangeId/risk` — `authMiddleware` → return current `riskLevel`

### MODIFY: `src/routes/internal.ts`

Internal routes (called by client/ Server Actions via Bearer token):
- `POST /signal` — manually trigger a signal
- `POST /sync-margin` — force margin sync
- `POST /snapshot` — force balance snapshot

### MODIFY: `src/routes/index.ts`

Mount all routers under `/v1`:
```ts
router.route('/webhooks', webhookRoutes)    // no auth
router.route('/positions', positionRoutes)  // authMiddleware inside
router.route('/margin', marginRoutes)       // authMiddleware inside
router.route('/internal', internalRoutes)  // authMiddleware inside
```

---

## Phase 10 — Entry Point

### MODIFY: `src/index.ts`

```ts
const app = new Hono()
app.use('*', cors(...))
app.use('*', loggerMiddleware)
app.onError(errorHandler)

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
app.route('/v1', router)

startWebSocketManager()   // start Binance WS streams for all active exchanges
startCronJobs()           // start all background jobs

export default {
  port: env.PORT,
  fetch: app.fetch,
}
```

---

## Verification Plan

### After Phase 1 (Schema)
```bash
bunx prisma migrate dev --name "full-trading-schema"
bunx prisma generate
# Verify: no TypeScript errors in src/generated/prisma
```

### After Each Phase
```bash
bun run --hot src/index.ts
# Server should start without errors on each phase
```

### Route Testing
```bash
# Health check
curl http://localhost:3001/v1/health

# Webhook (with test bot secret)
curl -X POST http://localhost:3001/v1/webhooks/bot/<botId> \
  -H "Content-Type: application/json" \
  -d '{"secret":"test","action":"ENTER_LONG","symbol":"BTCUSDT"}'

# Position close (with session token)
curl -X POST http://localhost:3001/v1/positions/<positionId>/close \
  -H "Authorization: Bearer <session.token>"
```

### Final Verification Checklist
- [ ] Webhook receives TradingView payload → signal created → position opened → protected orders placed
- [ ] Exit signal → position closed → P&L calculated → portfolio updated → balance snapshot taken
- [ ] `riskLevel === DANGER` blocks new margin trades
- [ ] Duplicate webhook signals are idempotently rejected
- [ ] WebSocket order fill updates Order and closes Position correctly
- [ ] Reconciliation catches missed fills
- [ ] API keys are never returned in any response
