# 02 — Database Schema & Relations

## Location
```
client/prisma/schema.prisma   ← Keep in sync
server/prisma/schema.prisma   ← Keep in sync (identical file)
```

Run migrations from either folder — both point to the same DB:
```bash
npx prisma migrate dev --name <migration-name>
npx prisma generate
```

> ⚠️ After ANY schema change: update BOTH files, run migrate, run generate in BOTH folders to fix TypeScript types.

---

## Full Entity Relationship Map

```
User
 ├── agent (User self-relation, nullable)        User is CUSTOMER → linked to an AGENT
 ├── customers (User[])                          User is AGENT → list of their CUSTOMERs
 ├── sessions (Session[])                        Better Auth sessions
 ├── accounts (Account[])                        Better Auth OAuth accounts
 ├── portfolio (Portfolio?)                       1:1 — stats dashboard
 ├── exchanges (Exchange[])                       User's Binance API connections
 ├── bots (Bot[])                                 Automated trading bots
 ├── positions (Position[])                       All trade positions (open + closed)
 ├── transactions (Transaction[])                 Financial audit log
 └── balanceSnapshots (BalanceSnapshot[])         NAV history for charts

Exchange
 ├── user (User)                                  Owner
 ├── bots (Bot[])                                 Bots using this exchange connection
 ├── marginAccounts (MarginAccount[])             Cross/isolated margin accounts
 └── transactions (Transaction[])                 Exchange-level transactions

Bot
 ├── user (User)                                  Owner
 ├── exchange (Exchange)                          Which API connection to use
 ├── signals (Signal[])                           All signals received
 └── positions (Position[])                       All positions opened by this bot

Signal
 ├── bot (Bot)                                    Which bot received this signal
 └── position (Position?)                         Position created from this signal (nullable)

Position
 ├── user (User)                                  Owner
 ├── bot (Bot?)                                   Bot that opened it (null = manual trade)
 ├── signals (Signal[])                           Signal(s) linked to this position
 └── orders (Order[])                             All orders for this position

Order
 └── position (Position)                          Parent position

MarginAccount
 ├── exchange (Exchange)                          Which exchange this belongs to
 └── borrowedAssets (BorrowedAsset[])             Per-asset debt tracking

BorrowedAsset
 └── marginAccount (MarginAccount)

Portfolio
 └── user (User)                                  1:1

BalanceSnapshot
 └── user (User)

Transaction
 ├── user (User)
 ├── exchange (Exchange?)                         Which exchange (nullable)
 └── (references positionId, orderId as strings — not FK for flexibility)
```

---

## Enums

```prisma
enum Role {
  ADMIN       // Full platform access
  AGENT       // Can view/manage assigned customers
  CUSTOMER    // Can only access own data
}

enum ExchangeName {
  BINANCE
}

enum MarginType {
  CROSS       // Shared margin pool across all pairs
  ISOLATED    // Separate margin per trading pair
}

enum PositionMode {
  ONE_WAY     // One position per symbol (long OR short)
  HEDGE       // Can hold long AND short simultaneously
}

enum BotStatus {
  ACTIVE      // Accepting and processing signals
  PAUSED      // Ignoring signals but not deleted
  STOPPED     // Manually stopped
  ERROR       // Failed — needs attention
}

enum TradeSide {
  LONG        // Bought / expecting price to rise
  SHORT       // Sold/borrowed / expecting price to fall
}

enum TradeType {
  SPOT        // Buy/sell owned assets, no leverage
  MARGIN      // Borrowed assets, can go short, leverage
}

enum SignalAction {
  ENTER_LONG    // Open a LONG position
  ENTER_SHORT   // Open a SHORT position (margin only)
  EXIT_LONG     // Close the open LONG position
  EXIT_SHORT    // Close the open SHORT position
}

enum SignalStatus {
  PENDING       // Just created, not yet processed
  PROCESSING    // Lock acquired, currently executing
  PROCESSED     // Successfully completed
  FAILED        // Error during execution
  SKIPPED       // Intentionally ignored (wrong side, no position, etc.)
}

enum PositionStatus {
  OPEN              // Active, can be closed
  CLOSED            // Manually or signal closed
  PARTIALLY_CLOSED  // Partial exit (rare)
  LIQUIDATED        // Force-closed by exchange due to margin call
}

enum OrderType {
  MARKET
  LIMIT
  STOP_LOSS
  TAKE_PROFIT
  OCO                  // One-Cancels-the-Other (SL + TP combined)
  STOP_LOSS_LIMIT
  TAKE_PROFIT_LIMIT
}

enum OrderPurpose {
  ENTRY         // Opening the position
  EXIT          // Closing the position
  STOP_LOSS     // Protective stop loss order
  TAKE_PROFIT   // Protective take profit order
  BORROW        // Borrowing assets (margin)
  REPAY         // Repaying borrowed assets (margin)
}

enum OrderStatus {
  PENDING           // Submitted to Binance, awaiting confirmation
  OPEN              // Active on the exchange order book
  PARTIALLY_FILLED  // Some quantity filled
  FILLED            // Fully executed
  CANCELED          // Canceled by us or expired
  REJECTED          // Rejected by exchange
  EXPIRED           // Time-in-force expired
  ERROR             // Failed to submit
}

enum SideEffectType {
  NO_SIDE_EFFECT    // Normal order, no borrowing
  MARGIN_BUY        // Auto-borrow before buying
  AUTO_REPAY        // Auto-repay after selling
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER_IN
  TRANSFER_OUT
  BORROW
  REPAY
  FEE
  REALIZED_PNL
}

enum RiskLevel {
  SAFE      // marginLevel >= 2.0  — normal trading
  WARNING   // marginLevel 1.5–1.99 — reduce exposure
  DANGER    // marginLevel < 1.5   — block all new trades
}
```

---

## Models — Detailed

### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  role          Role      @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Self-relation: CUSTOMER → AGENT
  agentId       String?
  agent         User?     @relation("AgentCustomers", fields: [agentId], references: [id])
  customers     User[]    @relation("AgentCustomers")

  // Better Auth
  sessions      Session[]
  accounts      Account[]

  // Platform data
  portfolio        Portfolio?
  exchanges        Exchange[]
  bots             Bot[]
  positions        Position[]
  transactions     Transaction[]
  balanceSnapshots BalanceSnapshot[]
}
```

**Key points:**
- `agentId` is null for ADMIN and AGENT users, set for CUSTOMERS who have been assigned to an agent.
- `portfolio` is a 1:1 relation — every user has exactly one Portfolio created on registration.
- `role` controls what data the user can see (see `docs/10-auth-roles.md`).

---

### Session & Account (Better Auth — Do Not Modify)
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  idToken               String?
  password              String?   // hashed, for credential auth
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([identifier, value])
}
```

> ⚠️ Do NOT add custom fields to Session, Account, or Verification. Better Auth manages these.

---

### Portfolio
```prisma
model Portfolio {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Lifetime stats
  totalPnl        Decimal  @default(0) @db.Decimal(20, 8)
  totalPnlPercent Decimal  @default(0) @db.Decimal(10, 4)
  winRate         Decimal  @default(0) @db.Decimal(5, 2)
  totalTrades     Int      @default(0)
  winningTrades   Int      @default(0)
  losingTrades    Int      @default(0)

  // Time-windowed P&L (updated by cron)
  dailyPnl        Decimal  @default(0) @db.Decimal(20, 8)
  weeklyPnl       Decimal  @default(0) @db.Decimal(20, 8)
  monthlyPnl      Decimal  @default(0) @db.Decimal(20, 8)

  // Balance summary (USD equivalent)
  totalBalance    Decimal  @default(0) @db.Decimal(20, 8)
  availableBalance Decimal @default(0) @db.Decimal(20, 8)
  totalDebt       Decimal  @default(0) @db.Decimal(20, 8)

  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())
}
```

**Key points:**
- Updated by `server/` after every position close.
- `client/` reads this for dashboard display — never recalculates from raw positions.
- `dailyPnl`, `weeklyPnl`, `monthlyPnl` are updated by a cron job in `server/`, not on every trade.

---

### BalanceSnapshot
```prisma
model BalanceSnapshot {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  navUsd     Decimal  @db.Decimal(20, 8)   // Total Net Asset Value in USD
  spotUsd    Decimal  @default(0) @db.Decimal(20, 8)
  marginUsd  Decimal  @default(0) @db.Decimal(20, 8)
  debtUsd    Decimal  @default(0) @db.Decimal(20, 8)
  netEquity  Decimal  @db.Decimal(20, 8)   // navUsd - debtUsd

  snapshotAt DateTime @default(now())

  @@index([userId, snapshotAt])
}
```

**Key points:**
- Written by `server/` after every position close and by a daily cron job.
- `client/` queries this for time-series charts (Recharts). Never aggregate live positions for charts.
- Index on `[userId, snapshotAt]` for efficient date-range queries.

---

### Exchange
```prisma
model Exchange {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  name           ExchangeName @default(BINANCE)
  label          String?      // User-defined name e.g. "Main Account"

  apiKey         String       // ⚠️ AES-256-GCM encrypted — NEVER store plaintext
  apiSecret      String       // ⚠️ AES-256-GCM encrypted — NEVER store plaintext

  positionMode   PositionMode @default(ONE_WAY)
  isActive       Boolean      @default(true)

  bots           Bot[]
  marginAccounts MarginAccount[]
  transactions   Transaction[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}
```

**Key points:**
- `client/` encrypts `apiKey` and `apiSecret` before saving via Server Action.
- `server/` decrypts them when building the Binance client.
- `apiKey` and `apiSecret` are NEVER returned in any API response to any role.
- `isActive: false` disables all bots using this exchange without deleting anything.

---

### MarginAccount
```prisma
model MarginAccount {
  id               String      @id @default(cuid())
  exchangeId       String
  exchange         Exchange    @relation(fields: [exchangeId], references: [id], onDelete: Cascade)

  marginType       MarginType
  symbol           String?     // null for CROSS, e.g. "BTCUSDT" for ISOLATED

  // Risk
  marginLevel      Decimal?    @db.Decimal(10, 4)  // Binance ratio (higher = safer)
  riskLevel        RiskLevel   @default(SAFE)
  liquidationPrice Decimal?    @db.Decimal(20, 8)

  // Aggregated balance (USD equiv)
  totalAssetUsd    Decimal     @default(0) @db.Decimal(20, 8)
  totalLiabilityUsd Decimal    @default(0) @db.Decimal(20, 8)
  netAssetUsd      Decimal     @default(0) @db.Decimal(20, 8)

  lastSyncAt       DateTime?   // Last time synced from Binance

  borrowedAssets   BorrowedAsset[]

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@unique([exchangeId, marginType, symbol])
  @@index([exchangeId])
}
```

**Key points:**
- `@@unique([exchangeId, marginType, symbol])` — one CROSS account per exchange (symbol=null), one ISOLATED per trading pair.
- `riskLevel` is set by `server/` based on `marginLevel` thresholds (SAFE ≥ 2.0, WARNING ≥ 1.5, DANGER < 1.5).
- `server/` checks `riskLevel === DANGER` before every margin trade and aborts if true.
- Synced every 5 minutes by a cron job and after every trade.

---

### BorrowedAsset
```prisma
model BorrowedAsset {
  id              String        @id @default(cuid())
  marginAccountId String
  marginAccount   MarginAccount @relation(fields: [marginAccountId], references: [id], onDelete: Cascade)

  asset           String        // e.g. "USDT", "BTC", "ETH"
  borrowed        Decimal       @db.Decimal(20, 8)  // Principal borrowed
  interest        Decimal       @default(0) @db.Decimal(20, 8)  // Accrued interest
  free            Decimal       @default(0) @db.Decimal(20, 8)  // Available to use
  locked          Decimal       @default(0) @db.Decimal(20, 8)  // Locked in open orders
  netAsset        Decimal       @default(0) @db.Decimal(20, 8)  // free + locked - borrowed - interest

  dailyInterestRate Decimal?    @db.Decimal(10, 8)  // From Binance, e.g. 0.00027

  updatedAt       DateTime      @updatedAt
  createdAt       DateTime      @default(now())

  @@unique([marginAccountId, asset])
}
```

**Key points:**
- `interest` increases every hour as Binance accrues it. Captured on each margin sync.
- `netAsset` is the true value of this asset position: `free + locked - borrowed - interest`.
- Used by `server/` to decide if `MARGIN_BUY` is needed (check `free` balance before trade).

---

### Bot
```prisma
model Bot {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  exchangeId       String
  exchange         Exchange  @relation(fields: [exchangeId], references: [id])

  name             String
  status           BotStatus @default(ACTIVE)

  // Strategy
  tradeType        TradeType @default(SPOT)
  marginType       MarginType?           // null for SPOT bots
  pairs            String[]              // e.g. ["BTCUSDT", "ETHUSDT"]

  // Sizing
  tradeAmountUsdt  Decimal   @db.Decimal(20, 8)
  leverage         Int       @default(1)  // 1 = no leverage (spot), 2-20 for margin

  // Protective orders
  stopLossPercent  Decimal?  @db.Decimal(6, 4)
  takeProfitPercent Decimal? @db.Decimal(6, 4)
  useOco           Boolean   @default(false)  // Use OCO order for SL+TP combined

  // Webhook auth
  webhookSecret    String?   // Verified against payload.secret on every webhook hit

  signals          Signal[]
  positions        Position[]

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId])
  @@index([exchangeId])
}
```

**Key points:**
- `pairs` is a `String[]` — the bot only trades symbols in this list. Webhook signals for other symbols are rejected.
- `webhookSecret` is the authentication mechanism for TradingView. If null, the webhook is disabled.
- `tradeType: SPOT` bots cannot go SHORT (no borrowing). `ENTER_SHORT` signals are skipped.
- `leverage: 1` on a MARGIN bot means no leverage multiplier but still uses the margin account.
- **One open position per bot at a time** — enforced in code, not DB constraint.

---

### Signal
```prisma
model Signal {
  id           String       @id @default(cuid())
  botId        String
  bot          Bot          @relation(fields: [botId], references: [id], onDelete: Cascade)

  action       SignalAction
  symbol       String       // Trading pair, e.g. "BTCUSDT"
  status       SignalStatus @default(PENDING)

  rawPayload   Json?        // Full webhook body stored for debugging

  // Idempotency — prevents double-execution
  processed    Boolean      @default(false)
  processedAt  DateTime?
  errorMessage String?

  // Created position (if signal opened one)
  positionId   String?
  position     Position?    @relation(fields: [positionId], references: [id])

  createdAt    DateTime     @default(now())

  @@index([botId, processed])
  @@index([symbol])
}
```

**Key points:**
- Created IMMEDIATELY on every webhook hit, before any trade logic. This is the audit trail.
- `processed` is the idempotency lock. It is set atomically via `updateMany` — if another process already set it, `count === 0` and we skip.
- `status` flow: `PENDING → PROCESSING → PROCESSED | FAILED | SKIPPED`
- `positionId` is set after a position is created or linked. Null for SKIPPED signals.
- `rawPayload` stores the exact webhook body for debugging/replay.
- Index on `[botId, processed]` — the most common query pattern when checking for unprocessed signals.

---

### Position
```prisma
model Position {
  id               String         @id @default(cuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  botId            String?
  bot              Bot?           @relation(fields: [botId], references: [id])

  symbol           String         // e.g. "BTCUSDT"
  side             TradeSide      // LONG or SHORT
  tradeType        TradeType      // SPOT or MARGIN
  marginType       MarginType?    // null for SPOT
  leverage         Int            @default(1)

  // Pricing
  entryPrice       Decimal?       @db.Decimal(20, 8)  // Set when ENTRY order fills
  exitPrice        Decimal?       @db.Decimal(20, 8)  // Set when EXIT order fills
  quantity         Decimal        @db.Decimal(20, 8)  // In base asset (e.g. BTC)
  notionalUsdt     Decimal?       @db.Decimal(20, 8)  // quantity × entryPrice

  // P&L (set on close)
  realizedPnl      Decimal        @default(0) @db.Decimal(20, 8)
  unrealizedPnl    Decimal        @default(0) @db.Decimal(20, 8)  // Updated by WS
  pnlPercent       Decimal        @default(0) @db.Decimal(10, 4)
  fee              Decimal        @default(0) @db.Decimal(20, 8)  // Accumulated fees

  status           PositionStatus @default(OPEN)

  // Binance protective order IDs (stored to cancel on manual exit)
  stopLossOrderId   String?
  takeProfitOrderId String?
  ocoOrderId        String?

  // Reconciliation
  isReconciled     Boolean        @default(false)  // DB matches Binance truth
  lastSyncAt       DateTime?

  openedAt         DateTime       @default(now())
  closedAt         DateTime?
  updatedAt        DateTime       @updatedAt

  signals          Signal[]
  orders           Order[]

  @@index([userId, status])
  @@index([botId])
  @@index([symbol])
}
```

**Key points:**
- `botId` is nullable — allows manual positions created from the terminal UI.
- `entryPrice` starts null, set when the ENTRY order is confirmed FILLED via WebSocket.
- `unrealizedPnl` is updated on every price tick for open positions. NOT used for closed P&L.
- `realizedPnl` is the final truth — calculated and written when position is CLOSED.
- `ocoOrderId`, `stopLossOrderId`, `takeProfitOrderId` — must be cancelled on manual exit.
- `isReconciled: false` means the position needs to be verified against Binance.
- Status flow: `OPEN → CLOSED | PARTIALLY_CLOSED | LIQUIDATED`

---

### Order
```prisma
model Order {
  id              String         @id @default(cuid())
  positionId      String
  position        Position       @relation(fields: [positionId], references: [id], onDelete: Cascade)

  // Binance IDs
  binanceOrderId  String?        // Binance's orderId (integer, stored as string)
  binanceClientId String?        // Our custom clientOrderId (for tracking)

  symbol          String
  side            String         // "BUY" or "SELL" (Binance terminology)
  type            OrderType
  purpose         OrderPurpose   // Why this order exists (ENTRY, EXIT, STOP_LOSS, etc.)
  sideEffect      SideEffectType @default(NO_SIDE_EFFECT)

  // Sizing
  quantity        Decimal        @db.Decimal(20, 8)
  price           Decimal?       @db.Decimal(20, 8)    // null for MARKET orders
  stopPrice       Decimal?       @db.Decimal(20, 8)    // For STOP_LOSS orders
  quoteQuantity   Decimal?       @db.Decimal(20, 8)    // For MARKET by quote amount

  // Fill tracking (updated via WebSocket)
  filledQuantity  Decimal        @default(0) @db.Decimal(20, 8)
  fillPercent     Decimal        @default(0) @db.Decimal(5, 2)
  avgFillPrice    Decimal?       @db.Decimal(20, 8)
  fee             Decimal        @default(0) @db.Decimal(20, 8)
  feeAsset        String?        // e.g. "BNB", "USDT"

  status          OrderStatus    @default(PENDING)
  errorMessage    String?        // ⚠️ ALWAYS populate on Binance errors — never null on failure

  rawResponse     Json?          // Full Binance API response — for auditing

  submittedAt     DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  filledAt        DateTime?      // Set when status = FILLED

  @@index([positionId])
  @@index([binanceOrderId])
  @@index([symbol, status])
}
```

**Key points:**
- Every Binance API call creates an Order record — success or failure. No silent failures.
- `purpose` defines why this order exists — critical for the WebSocket handler to know what to do when it fills.
- `binanceOrderId` is how the WebSocket listener matches incoming fill events to our DB records.
- `errorMessage` MUST be populated on any Binance rejection or exception. Used for debugging and user alerts.
- `rawResponse` stores the full Binance JSON response for every order — essential for auditing and reconciliation.
- `fillPercent = (filledQuantity / quantity) * 100` — updated on every partial fill event.

---

### Transaction
```prisma
model Transaction {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  exchangeId  String?
  exchange    Exchange?       @relation(fields: [exchangeId], references: [id])

  type        TransactionType
  asset       String          // e.g. "USDT", "BTC"
  amount      Decimal         @db.Decimal(20, 8)
  fee         Decimal         @default(0) @db.Decimal(20, 8)
  usdValue    Decimal?        @db.Decimal(20, 8)  // USD equiv at time of transaction

  // Soft references (not FK — keeps transactions valid even if records deleted)
  binanceTxId String?
  positionId  String?
  orderId     String?

  note        String?
  createdAt   DateTime        @default(now())

  @@index([userId, createdAt])
  @@index([positionId])
}
```

**Key points:**
- `positionId` and `orderId` are plain strings (not FK relations) — transactions must remain even if positions are archived.
- Written by `server/` for deposits, withdrawals, borrows, repays, and realized P&L events.
- Used by `client/` for the financial history / audit log UI.

---

## Important Indexes Summary

| Model | Index | Why |
|-------|-------|-----|
| User | `agentId` | Agent → customers lookup |
| Exchange | `userId` | User's exchange list |
| Bot | `userId`, `exchangeId` | Bot list, exchange bots |
| Signal | `[botId, processed]` | Find unprocessed signals |
| Signal | `symbol` | Symbol-based signal lookup |
| Position | `[userId, status]` | Open positions by user |
| Position | `botId`, `symbol` | Bot positions, symbol positions |
| Order | `positionId` | All orders for a position |
| Order | `binanceOrderId` | WebSocket fill event matching |
| Order | `[symbol, status]` | Open orders by symbol |
| BalanceSnapshot | `[userId, snapshotAt]` | Time-series chart queries |
| Transaction | `[userId, createdAt]` | Transaction history |
| MarginAccount | `exchangeId` | Exchange's margin accounts |

---

## Decimal Precision Rules

| Data type | Prisma type | DB type |
|-----------|------------|---------|
| Crypto quantity (BTC, ETH amounts) | `Decimal` | `@db.Decimal(20, 8)` |
| USD / USDT amounts | `Decimal` | `@db.Decimal(20, 8)` |
| Percentages (P&L %) | `Decimal` | `@db.Decimal(10, 4)` |
| Win rate | `Decimal` | `@db.Decimal(5, 2)` |
| Interest rates | `Decimal` | `@db.Decimal(10, 8)` |
| Margin level ratio | `Decimal` | `@db.Decimal(10, 4)` |

> ⚠️ NEVER use `Float` for financial data. Floating-point precision errors cause wrong P&L calculations.

---

## Schema Change Checklist

When making any schema change:

1. Edit `client/prisma/schema.prisma`
2. Copy identical change to `server/prisma/schema.prisma`
3. Run `npx prisma migrate dev --name <description>` from either folder
4. Run `npx prisma generate` in `client/`
5. Run `npx prisma generate` in `server/`
6. Fix all TypeScript type errors in both projects before committing
