---
name: bytix-server
description: Full context for the Bytix AI server project — a Bun + Hono trading engine for automated crypto trading via Binance. Use this skill whenever working on the server/ project.
---

# Bytix AI — Server Project Skill

## What This Project Is

Bytix AI is a **non-custodial automated crypto trading platform**. This is the **server/** project — a **Bun + Hono** backend (trading engine). It runs on port 3001 and is hosted independently from the Next.js client portal.

**The server owns ALL trading logic.** The Next.js client portal (in a separate `client/` folder) handles only: auth, UI, display, and CRUD configuration. Both apps share the same PostgreSQL database via Prisma.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | **Bun** |
| Framework | **Hono** v4 |
| ORM | **Prisma** with `@prisma/adapter-pg` (generated to `src/generated/prisma`) |
| Auth | **Better Auth** (session verification only — no sign-up/login here) |
| Binance SDK | `@binance/spot`, `@binance/margin-trading` |
| Validation | **Zod** v4 |
| Encryption | **AES-256-GCM** via Node `crypto` (shared with client) |
| DB | **PostgreSQL** (shared with `client/`) |

---

## Project File Structure

```
server/
├── src/
│   ├── index.ts                        ← Hono entry point, mounts all routes
│   ├── binance/
│   │   ├── client.ts                   ← Build Binance SDK client from decrypted keys
│   │   ├── spot.ts                     ← Spot order helpers
│   │   ├── margin.ts                   ← Margin order helpers + OCO
│   │   ├── market.ts                   ← Price fetching
│   │   ├── websocket.ts                ← UserDataStream + market price streams
│   │   └── utils.ts                    ← mapBinanceStatus, calculateProtectivePrices
│   ├── lib/
│   │   ├── env.ts                      ← Zod-validated env vars (always import from here)
│   │   ├── db.ts                       ← Prisma singleton (export: `db`)
│   │   ├── encryption.ts               ← AES-256-GCM encrypt/decrypt
│   │   ├── auth.ts                     ← Better Auth config
│   │   └── ownership.ts                ← assertPositionOwnership, ForbiddenError
│   ├── middleware/
│   │   ├── auth.ts                     ← Bearer token → DB session lookup → attach user
│   │   ├── require-role.ts             ← requireRole('ADMIN') | requireRole('AGENT') etc.
│   │   ├── error-handler.ts            ← Global Hono error handler
│   │   └── logger.ts                   ← Request logger
│   ├── routes/
│   │   ├── index.ts                    ← Mount all routers under /v1
│   │   ├── webhooks.ts                 ← POST /webhooks/bot/:botId (NO auth middleware)
│   │   ├── positions.ts                ← POST /:id/close, GET /:id/sync (authMiddleware)
│   │   ├── margin.ts                   ← POST /:exchangeId/sync, GET /:exchangeId/risk
│   │   └── internal.ts                 ← POST /signal, sync-margin, snapshot (internalAuth)
│   ├── services/
│   │   ├── signal-processor.ts         ← Core: processSignal(), openPosition(), closePosition()
│   │   ├── order-executor.ts           ← saveOrder(), placeProtectiveOrders()
│   │   ├── risk-checker.ts             ← assertMarginSafe(), classifyRisk()
│   │   ├── pnl-calculator.ts           ← calculatePnl(), calculateUnrealizedPnl()
│   │   ├── portfolio-updater.ts        ← updatePortfolio(), takeBalanceSnapshot()
│   │   └── margin-sync.ts              ← syncMarginAccount(), determineSideEffect()
│   ├── jobs/
│   │   ├── index.ts                    ← startCronJobs()
│   │   ├── reconciliation.ts           ← Every 15 min: sync open positions vs Binance
│   │   ├── margin-sync.ts              ← Every 5 min: sync margin accounts
│   │   └── balance-snapshot.ts         ← Daily NAV snapshots
│   ├── types/
│   │   └── trading.ts                  ← Hono context Variables type, PnlResult, etc.
│   ├── validation/
│   │   ├── signal.schema.ts            ← Zod schema for webhook payload
│   │   └── bot.schema.ts               ← Zod schemas for bot CRUD
│   └── generated/
│       └── prisma/                     ← Prisma auto-generated client (do not edit)
├── prisma/
│   └── schema.prisma                   ← MUST always be identical to client/prisma/schema.prisma
├── docs/                               ← All 12 documentation files (READ BEFORE CODING)
├── .env
└── package.json
```

---

## Environment Variables (`.env`)

```env
DATABASE_URL=postgresql://user:pass@host:5432/bytix   # Same DB as client/
BETTER_AUTH_SECRET=                                    # Same as client/
BETTER_AUTH_URL=http://localhost:3000                  # client/ URL
ENCRYPTION_KEY=                                        # 32-byte hex, AES-256-GCM — SAME as client/
BINANCE_BASE_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
PORT=3001
NODE_ENV=development
```

---

## Critical Rules — NEVER Break These

### 🔐 Security
- **NEVER return `apiKey` or `apiSecret` in ANY API response to ANY role — ever.**
- `apiKey` and `apiSecret` are stored encrypted (AES-256-GCM). Encrypt in `client/`, decrypt in `server/` only when building the Binance SDK client.
- Use the `encrypt()` / `decrypt()` functions from `src/lib/encryption.ts`.

### 💰 Financial Data
- **NEVER use `Float` for financial values.** Always use Prisma `Decimal` and `@db.Decimal(20, 8)` or the appropriate precision from the schema.
- Use `new Decimal(...)` from `@prisma/client/runtime/library`.
- See doc 02 for precision rules per data type.

### 📡 Webhooks (TradingView)
- **Always return HTTP 200 from webhook routes** — even for errors or skipped signals. Returning 4xx/5xx causes TradingView to retry and creates duplicate signals.
- Use the body's `success: false` field to communicate errors.

### 📊 Every Binance Call Must Create an Order Record
- Every call to Binance (success OR failure) must persist an `Order` record in the DB.
- Populate `Order.errorMessage` on every Binance exception. Never fail silently.
- Populate `Order.rawResponse` with the full Binance JSON for auditing.

### 🔢 Idempotency Lock for Signals
- Before processing any signal, atomically set `processed: true` using `prisma.signal.updateMany()`.
- If `count === 0`, another process claimed it — abort immediately.

### ⛔ Risk Gate Before Every Margin Trade
- Always call `assertMarginSafe()` before placing any margin entry order.
- If `riskLevel === 'DANGER'` → skip with reason, never trade.

### 📁 Prisma Schema Sync
- `server/prisma/schema.prisma` and `client/prisma/schema.prisma` must ALWAYS be identical.
- After any schema change: run `bunx prisma migrate dev`, then `bunx prisma generate` in BOTH projects.

---

## Authentication Pattern

### Three Caller Types

| Caller | Auth Method |
|---|---|
| Browser → Next.js `client/` | Better Auth cookie (handled by client, not server) |
| `client/` Server Action → `server/` | `Authorization: Bearer <session.token>` verified in `session` table |
| TradingView → `server/` | `payload.secret === bot.webhookSecret` in request body |

### How Bearer Token Auth Works
`server/` does NOT use Better Auth for actual login. It verifies requests from `client/` by looking up the token in the shared `Session` table:
```typescript
const session = await db.session.findUnique({
  where: { token },
  include: { user: true }
})
if (!session || session.expiresAt < new Date()) → 401
c.set('user', session.user)
```

### Route Protection
```typescript
// Protected by session
positionRoutes.use('*', authMiddleware)

// Protected by session + role
adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', requireRole('ADMIN'))

// Webhook — no session middleware
webhookRoutes.post('/bot/:botId', ...)  // validated by payload.secret only
```

---

## Core Business Logic (Read Docs for Full Code)

### Signal Flow (doc 03)
```
POST /webhooks/bot/:botId
 1. Validate bot exists, is ACTIVE, secret matches, symbol in pairs
 2. Create Signal record (ALWAYS — this is the audit trail)
 3. Atomic idempotency lock (updateMany where processed=false)
 4. Check for existing open position
 5. Apply decision table → open / close / skip
 6. Update Signal status (PROCESSED | SKIPPED | FAILED)
 7. Return 200 always
```

### Position Decision Table (doc 04)
| Open Position | Signal | Action |
|---|---|---|
| None | ENTER_LONG | ✅ Open LONG |
| None | ENTER_SHORT | ✅ Open SHORT (MARGIN only) |
| None | EXIT_* | ⚠️ SKIP |
| LONG | EXIT_LONG | ✅ Close LONG |
| SHORT | EXIT_SHORT | ✅ Close SHORT |
| LONG | ENTER_LONG | ⚠️ SKIP (already open) |
| Any | Wrong EXIT | ⚠️ SKIP (side mismatch) |

**Strict mode is the default — no flip mode.**

### P&L Formulas (doc 06)
```
LONG: realizedPnl = (exitPrice - entryPrice) × quantity − totalFees
SHORT: realizedPnl = (entryPrice - exitPrice) × quantity − totalFees
pnlPercent = (realizedPnl / notionalUsdt) × 100
```

### Risk Levels (doc 08)
```
marginLevel >= 2.0 → SAFE     (trades allowed)
marginLevel >= 1.5 → WARNING  (trades allowed, show warning in UI)
marginLevel < 1.5  → DANGER   (BLOCK all new trades)
marginLevel null   → DANGER   (unknown = dangerous)
```

---

## Database Schema Quick Reference

The Prisma client is imported from `src/generated/prisma`. Export/import the singleton as `db` from `src/lib/db.ts`.

### Key Models
- `User` — with self-relation for agent→customer
- `Session`, `Account`, `Verification` — Better Auth managed, do NOT add custom fields
- `Exchange` — has encrypted `apiKey`, `apiSecret`
- `Bot` — trading config, `webhookSecret`, ACTIVE/PAUSED/STOPPED/ERROR
- `Signal` — every webhook hit, idempotency via `processed` field
- `Position` — one open per bot (enforced in code, not DB)
- `Order` — every Binance API call, stores `rawResponse`
- `Portfolio` — 1:1 per user, updated in the close position transaction
- `MarginAccount` + `BorrowedAsset` — synced from Binance every 5 min
- `BalanceSnapshot` — time-series NAV for charts, taken after every close
- `Transaction` — financial audit log (`positionId`/`orderId` are strings, not FKs)

### Decimal Precision
```
Crypto amounts:    @db.Decimal(20, 8)
USD amounts:       @db.Decimal(20, 8)
Percentages:       @db.Decimal(10, 4)
Win rate:          @db.Decimal(5, 2)
Interest rates:    @db.Decimal(10, 8)
Margin level:      @db.Decimal(10, 4)
```

---

## What HONO Server Owns (vs Next.js Client)

The server **ONLY** handles these — do NOT add any of these to Next.js:
- All Binance API calls (spot, margin, websocket)
- All trade execution (entry/exit orders)
- All order record creation
- Signal processing
- P&L calculation
- Risk checking
- Margin account sync
- Portfolio stats update (after trade)
- Balance snapshots
- Background/cron jobs
- WebSocket streams

The Next.js client handles:
- User login / session management (Better Auth)
- Reading and displaying data (Prisma reads)
- Bot/exchange CRUD configuration
- Encrypting API keys before saving

---

## Binance Error Codes to Handle

| Code | Meaning | Action |
|---|---|---|
| -1013 | Invalid quantity | Log + skip, notify user |
| -1100 | Bad parameter | Log + skip |
| -2010 | Insufficient balance | Log, set riskLevel = WARNING |
| -2015 | Invalid API key | Log, disable exchange |
| -3045 | Margin no balance | Log, check borrow availability |
| -1003 | Rate limit exceeded | Backoff + retry after delay |

---

## Docs Reference

All 12 docs live in `server/docs/`. Always read the relevant doc before implementing:

| Doc | Topic |
|---|---|
| 01-project-overview.md | Architecture, file structure, env vars |
| 02-database-schema.md | Full Prisma schema with all fields |
| 03-signal-webhook-flow.md | Webhook endpoint, signal processing steps |
| 04-position-lifecycle.md | Open/close position logic, decision table |
| 05-order-execution.md | Binance order helpers, SL/TP, error codes |
| 06-pnl-calculation.md | P&L formulas, portfolio update, fee tracking |
| 07-margin-borrowing.md | SPOT vs MARGIN, borrowing, SHORT mechanics |
| 08-risk-management.md | Risk levels, assertMarginSafe, liquidation |
| 09-realtime-sync.md | WebSocket streams, reconciliation, snapshots |
| 10-auth-roles.md | Auth middleware, role rules, encryption |
| 11-ui-components.md | UI rules (for client/ — not relevant here) |
| 12-nextjs-vs-hono-split.md | Definitive guide on what goes where |
