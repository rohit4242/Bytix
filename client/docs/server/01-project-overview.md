# 01 — Project Overview & Architecture

## What Is Bytix AI?

Bytix AI is a **non-custodial** automated crypto trading platform split across two **separate project folders** that share the same PostgreSQL database.

---

## Project Structure (Two Separate Folders)

```
bytix-ai/
├── client/                           ← Next.js App (Portal UI)
│   ├── app/
│   │   ├── (auth)/                   ← Login, register pages
│   │   ├── (dashboard)/
│   │   │   ├── admin/                ← Admin portal pages
│   │   │   ├── agent/                ← Agent portal pages
│   │   │   └── customer/             ← Customer portal pages
│   │   ├── actions/                  ← Server Actions (display + CRUD)
│   │   │   ├── portfolio.ts
│   │   │   ├── positions.ts
│   │   │   ├── bots.ts
│   │   │   ├── exchanges.ts
│   │   │   └── users.ts
│   │   └── api/
│   │       └── auth/
│   │           └── [...betterauth]/
│   │               └── route.ts      ← Better Auth handler (ONLY api route)
│   ├── components/
│   │   ├── ui/                       ← Shadcn components
│   │   └── trading/                  ← Custom trading UI components
│   ├── lib/
│   │   ├── auth.ts                   ← Better Auth config
│   │   ├── prisma.ts                 ← Prisma client instance
│   │   ├── server-client.ts          ← HTTP client to call server (Hono)
│   │   └── encryption.ts             ← AES-256 encrypt/decrypt
│   ├── prisma/
│   │   └── schema.prisma             ← Same schema as server
│   ├── .env.local
│   └── package.json
│
└── server/                           ← Bun + Hono App (Trading Engine)
    ├── src/
    │   ├── index.ts                  ← Hono app entry point + server boot
    │   ├── routes/
    │   │   ├── webhooks.ts           ← POST /webhooks/bot/:botId
    │   │   ├── positions.ts          ← Position management
    │   │   ├── margin.ts             ← Margin sync
    │   │   └── internal.ts           ← Internal routes for client app
    │   ├── services/
    │   │   ├── signal-processor.ts   ← Core signal → trade logic
    │   │   ├── position-manager.ts   ← Open/close positions
    │   │   ├── order-executor.ts     ← Place Binance orders
    │   │   ├── risk-checker.ts       ← Pre-trade risk validation
    │   │   ├── pnl-calculator.ts     ← P&L math
    │   │   └── margin-sync.ts        ← Sync margin from Binance
    │   ├── binance/
    │   │   ├── client.ts             ← Binance SDK wrapper
    │   │   ├── spot.ts               ← Spot order helpers
    │   │   ├── margin.ts             ← Margin order helpers
    │   │   └── websocket.ts          ← WS stream manager
    │   ├── lib/
    │   │   ├── prisma.ts             ← Prisma client instance
    │   │   └── encryption.ts         ← Same AES-256 logic
    │   └── jobs/
    │       ├── reconciliation.ts     ← Fallback order sync
    │       ├── margin-sync.ts        ← Periodic margin refresh
    │       └── balance-snapshot.ts   ← Periodic NAV snapshots
    ├── prisma/
    │   └── schema.prisma             ← Same schema as client
    ├── .env
    └── package.json
```

> ⚠️ **Both `client/prisma/schema.prisma` and `server/prisma/schema.prisma` must always be identical.** When you update the schema, update BOTH and run migrations from EITHER folder (they point to the same DB).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT BROWSER                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌──────────────────┐        ┌─────────────────────┐
│  client/         │        │  server/             │
│  Next.js Portal  │        │  Bun + Hono Engine   │
│                  │        │                      │
│  Better Auth     │        │  Webhook endpoint    │
│  Server Actions  │        │  Signal processor    │
│  CRUD (bots,     │        │  Binance orders      │
│  exchanges,      │        │  WebSocket streams   │
│  settings)       │        │  Risk checks         │
│  Display data    │        │  P&L calculation     │
│  Prisma (read)   │        │  Margin sync         │
│                  │   ──►  │  Prisma (read/write) │
│                  │        │                      │
└────────┬─────────┘        └──────────┬───────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │   PostgreSQL DB     │
             │   (Shared)          │
             └─────────────────────┘
```

---

## Two Apps — Clear Responsibilities

### `client/` — Next.js Portal
**Purpose:** UI only. Auth, display data, configure bots and exchanges.

- Better Auth (sessions, OAuth, credentials)
- Admin / Agent / Customer portal pages
- Server Actions for reading and simple CRUD
- Calls `server/` via HTTP for any trading action

### `server/` — Bun + Hono Engine
**Purpose:** All trading and exchange logic.

- TradingView webhook endpoint
- Signal processing and position lifecycle
- All Binance API calls
- WebSocket order fill streams
- Risk checks, P&L, margin sync
- Cron/background jobs

---

## Shared Setup (Both Projects Have)

| Thing | client/ | server/ |
|-------|---------|---------|
| Better Auth | ✅ Full setup | ✅ For verifying sessions on internal routes |
| Prisma | ✅ Same schema | ✅ Same schema |
| DATABASE_URL | ✅ Same value | ✅ Same value |
| ENCRYPTION_KEY | ✅ Encrypt on save | ✅ Decrypt on use |

---

## Communication Pattern

When a user action in `client/` needs trading logic:

```
User clicks "Close Position" in Next.js UI
  ↓
Server Action: closePositionAction(positionId)
  → Verifies user owns this position (Prisma)
  → Calls server via serverClient.closePosition(positionId)
      with header: Authorization: Bearer <session.token>  ← from Better Auth session
  ↓
Hono /positions/:id/close
  → Verifies Authorization: Bearer <session.token>  ← from Better Auth session
  → Cancels SL/TP on Binance
  → Places exit MARKET order
  → Calculates P&L
  → Updates DB
  ↓
Server Action returns result → UI refreshes
```

---

## Environment Variables

### client/.env.local
```env
DATABASE_URL=postgresql://user:pass@host:5432/bytix
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
ENCRYPTION_KEY=                         # 32-byte hex, AES-256-GCM
SERVER_API_URL=http://localhost:3001    # Hono backend URL
```

### server/.env
```env
DATABASE_URL=postgresql://user:pass@host:5432/bytix   # Same DB
BETTER_AUTH_SECRET=                                    # Same secret
ENCRYPTION_KEY=                                        # Same key
BINANCE_BASE_URL=https://api.binance.com
BINANCE_WS_URL=wss://stream.binance.com:9443
PORT=3001
```

---

## What Goes Where — Quick Reference

| Feature | client/ (Next.js) | server/ (Hono) |
|---------|------------------|----------------|
| User login / register | ✅ | ❌ |
| Show portfolio stats | ✅ Server Action | ❌ |
| Show positions list | ✅ Server Action | ❌ |
| Create / edit bot config | ✅ Server Action | ❌ |
| Add exchange API keys | ✅ Server Action (encrypt first) | ❌ |
| TradingView webhook | ❌ | ✅ |
| Execute Binance order | ❌ | ✅ |
| Close position (manual) | ❌ → calls server | ✅ |
| WebSocket order fills | ❌ | ✅ |
| Margin sync cron | ❌ | ✅ |
| Risk check | ❌ | ✅ |
| P&L calculation | ❌ | ✅ |
| Reconciliation job | ❌ | ✅ |

---

## Auth Between client/ and server/

`server/` verifies requests from `client/` using the Better Auth session token as a Bearer token. No separate JWT or shared secret needed — both apps query the same `Session` table.

```typescript
// client/ always sends:
Authorization: Bearer <session.token>

// server/ middleware verifies:
const session = await prisma.session.findUnique({ where: { token } })
if (!session || session.expiresAt < new Date()) → 401
c.set('user', session.user)  // attached to context
```

See `docs/10-auth-roles.md` for the complete middleware and client implementation.
