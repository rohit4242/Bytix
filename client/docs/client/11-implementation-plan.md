# Bytix AI — Client Frontend Implementation Plan

## Goal

Build the complete **Next.js 14 (App Router) client frontend** for Bytix AI from scratch. The backend (Bun + Hono) is already complete. This plan covers every file needed — from lib utilities to all three role-based portals (Customer, Agent, Admin).

**Key constraints from docs:**
- No API routes except `/api/auth/[...betterauth]`
- All data operations go through **Server Actions**
- Trade/exchange actions → `serverClient` → Hono
- Never expose `apiKey`/`apiSecret` in any query
- Prisma schema is already in place and migrated

---

## What Already Exists

From inspecting `src/`:

| Exists | What |
|--------|------|
| ✅ | `src/lib/auth.ts`, `auth-server.ts`, `db.ts`, `utils.ts`, `nav-config.ts` |
| ✅ | `src/app/(auth)/` — sign-in, sign-up, callback, layout |
| ✅ | `src/app/(main)/` — admin, agent, customer stub folders + layout |
| ✅ | `src/app/api/` — Better Auth route |
| ✅ | `src/components/layout/` — some layout components |
| ✅ | `src/components/ui/` — Shadcn components (53 items) |
| ✅ | Prisma schema, generated client |
| ❌ | Server Actions (`app/actions/`) |
| ❌ | React Query hooks (`hooks/use-*.ts`) |
| ❌ | Trading UI components (`components/trading/`) |
| ❌ | Form components (`components/forms/`) |
| ❌ | Zustand UI store (`stores/ui-store.ts`) |
| ❌ | All portal pages (customer/bots, positions, terminal, settings; agent/customers; admin/users) |
| ❌ | `lib/` additions: server-client, encryption, auth-helpers, prisma-selects, action-handler |
| ❌ | `middleware.ts` route protection |
| ❌ | `app/error.tsx`, `app/not-found.tsx` |
| ❌ | `components/ui/error-boundary.tsx` |

---

## Full Folder Structure (Target State)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                  ← Auth shell (no sidebar)
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── _components/
│   │       ├── login-form.tsx
│   │       └── sign-up-form.tsx
│   │
│   ├── (main)/                         ← Existing route group (keep as-is)
│   │   ├── layout.tsx                  ← Dashboard shell (sidebar + navbar)
│   │   ├── admin/
│   │   │   ├── layout.tsx              ← ADMIN guard
│   │   │   ├── page.tsx                ← Platform overview
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx            ← Impersonated user full dashboard
│   │   │   └── users/
│   │   │       ├── page.tsx            ← All users table
│   │   │       └── [userId]/page.tsx   ← User detail + role + agent assign
│   │   ├── agent/
│   │   │   ├── layout.tsx              ← AGENT guard
│   │   │   ├── page.tsx                ← Agent overview
│   │   │   └── customers/
│   │   │       ├── page.tsx            ← Customer list
│   │   │       └── [userId]/page.tsx   ← Customer read-only portfolio
│   │   └── customer/
│   │       ├── layout.tsx              ← Auth guard (all roles can enter)
│   │       ├── page.tsx                ← Portfolio dashboard
│   │       ├── bots/
│   │       │   ├── page.tsx            ← Bot list
│   │       │   └── [botId]/page.tsx    ← Bot detail + webhook + signal log
│   │       ├── positions/page.tsx      ← Open & closed positions (tabbed)
│   │       ├── terminal/page.tsx       ← Manual trade terminal
│   │       └── settings/page.tsx       ← Exchange API keys + profile
│   │
│   ├── actions/                        ← ALL server actions
│   │   ├── portfolio.ts
│   │   ├── positions.ts
│   │   ├── bots.ts
│   │   ├── exchanges.ts
│   │   ├── signals.ts
│   │   └── users.ts
│   │
│   ├── api/
│   │   └── auth/[...betterauth]/route.ts  ← EXISTS
│   │
│   ├── layout.tsx                      ← Root layout (Providers + Toaster)
│   ├── page.tsx                        ← Landing / redirect to /customer
│   ├── error.tsx                       ← Global error boundary
│   └── not-found.tsx
│
├── components/
│   ├── ui/                             ← EXISTS — Shadcn only, do not modify
│   ├── layout/
│   │   ├── sidebar.tsx                 ← Role-aware nav
│   │   ├── navbar.tsx                  ← Top bar + user menu + logout
│   │   ├── portal-guard.tsx            ← Client-side role redirect
│   │   └── admin-user-selector.tsx     ← Admin customer context switcher
│   ├── trading/
│   │   ├── pnl-badge.tsx
│   │   ├── price-ticker.tsx
│   │   ├── risk-indicator.tsx
│   │   ├── bot-status.tsx
│   │   ├── signal-badge.tsx
│   │   ├── portfolio-chart.tsx
│   │   ├── danger-banner.tsx
│   │   ├── position-row.tsx
│   │   ├── bot-card.tsx
│   │   ├── webhook-config.tsx
│   │   └── signal-log.tsx
│   └── forms/
│       ├── create-bot-form.tsx
│       ├── exchange-form.tsx
│       └── trade-form.tsx
│
├── hooks/
│   ├── use-portfolio.ts
│   ├── use-positions.ts
│   ├── use-bots.ts
│   ├── use-exchanges.ts
│   ├── use-live-price.ts
│   └── use-signals.ts
│
├── lib/
│   ├── auth.ts                         ← EXISTS (Better Auth config)
│   ├── auth-server.ts                  ← EXISTS
│   ├── db.ts                           ← EXISTS (Prisma singleton)
│   ├── utils.ts                        ← EXISTS (extend with formatCurrency etc.)
│   ├── auth-client.ts                  ← NEW: createAuthClient + useSession etc.
│   ├── auth-helpers.ts                 ← NEW: requireAuth, requireRole, assertOwnership
│   ├── server-client.ts                ← NEW: Axios wrapper to call Hono
│   ├── encryption.ts                   ← NEW: AES-256-GCM encrypt/decrypt
│   ├── action-handler.ts               ← NEW: Prisma error wrapper
│   └── prisma-selects.ts               ← NEW: SAFE_EXCHANGE_SELECT, etc.
│
├── stores/
│   └── ui-store.ts                     ← NEW: Zustand UI state
│
├── types/
│   └── index.ts                        ← NEW: Shared TS types
│
└── middleware.ts                       ← NEW: Route protection
```

---

## Proposed Changes — Phase by Phase

---

### Phase 1 — Foundation (Core Lib Files)

#### [MODIFY] utils.ts
Extend existing with `formatCurrency`, `formatPnl`, `formatPercent`, `pnlColor` helpers.

#### [NEW] auth-client.ts
```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

export const { useSession, signIn, signOut, signUp } = authClient
```

#### [NEW] auth-helpers.ts
Server-side helpers: `requireAuth()`, `requireRole()`, `assertBotOwnership()`, `assertExchangeOwnership()`.
Custom errors: `AuthError` (401), `NotFoundError` (404), `ValidationError` (400).

#### [NEW] server-client.ts
Axios wrapper that grabs the Better Auth session token and sends it as `Authorization: Bearer <token>` to the Hono server. Exposes:
- `closePosition(positionId)`
- `syncPosition(positionId)`
- `triggerSignal(botId, action, symbol)`
- `syncMargin(exchangeId)`
- `getMarginRisk(exchangeId)`
- `forceSnapshot()`

Timeout: 15 seconds. No auto-retry (prevents double trade orders).

#### [NEW] encryption.ts
AES-256-GCM `encrypt(text)` / `decrypt(text)`. Uses `ENCRYPTION_KEY` env var. Identical to `server/src/lib/encryption.ts`.

#### [NEW] action-handler.ts
Wraps Server Actions in try/catch to convert `PrismaClientKnownRequestError` P2002/P2025 into friendly messages.

#### [NEW] prisma-selects.ts
Constants: `SAFE_EXCHANGE_SELECT` (no apiKey/apiSecret), `POSITION_LIST_SELECT`, `BOT_LIST_SELECT`.

#### [NEW] middleware.ts
Uses `getSessionCookie` from `better-auth/cookies`. Unauthenticated requests to any non-public route redirect to `/sign-in`. Public routes: `['/sign-in', '/sign-up', '/api/auth']`.

#### [NEW] stores/ui-store.ts
Zustand store: `sidebarOpen`, `activeModal`, **`selectedUserId`** (admin customer context), `toggleSidebar()`, `openModal(id)`, `closeModal()`, **`setSelectedUser(id | null)`**.

```typescript
interface UIStore {
  sidebarOpen:    boolean
  activeModal:    string | null
  selectedUserId: string | null  // Admin: which user the admin is currently "viewing as"
  toggleSidebar:  () => void
  openModal:      (id: string) => void
  closeModal:     () => void
  setSelectedUser:(id: string | null) => void
}
```

#### [NEW] types/index.ts
Re-export Prisma enums and common interfaces used across the app.

#### [MODIFY] app/layout.tsx
Add `<Providers>` wrapper (QueryClientProvider + Sonner `<Toaster position="bottom-right" richColors />`).

#### [NEW] app/error.tsx
Global error page with "Try again" reset button.

#### [NEW] app/not-found.tsx
404 page.

#### [NEW] components/ui/error-boundary.tsx
React class `ErrorBoundary` with `hasError` state and "Try again" button fallback.

---

### Phase 2 — Auth Pages

The `(auth)` folder already has `sign-in/` and `sign-up/` page stubs. We'll fill them in.

#### [MODIFY] sign-in/page.tsx
Uses `authClient.signIn.email({ email, password })`. On success → pushes to `/customer`. Shows `toast.error` on failure.

#### [MODIFY] sign-up/page.tsx
Uses `authClient.signUp.email({ email, password, name })`. Auto-assigns `CUSTOMER` role (default in auth config).

Auth forms use React Hook Form + Zod with Shadcn `Form`, `FormField`, `Input`, `Button`.

---

### Phase 3 — Dashboard Layout Shell

> **Note:** The existing route group is `(main)`. Keep the folder name as-is — renaming route groups breaks Next.js routing. Update layout content in-place.

#### [MODIFY] app/(main)/layout.tsx
Layout renders: `<Sidebar />` + `<Navbar />` + `{children}`. Wraps in `<PortalGuard>`.

#### [MODIFY] components/layout/sidebar.tsx
Role-aware navigation using `useSession()`. NAV map per role:
- **CUSTOMER**: Dashboard, Bots, Positions, Terminal, Settings
- **AGENT**: Overview, Customers
- **ADMIN**: Platform Overview, All Users — **plus `<AdminUserSelector />`** at the top of the nav section. When a user is selected, the sidebar dynamically adds Customer nav items (Portfolio, Bots, Positions, Exchanges, Signals) with a highlighted "Viewing as: [Name]" banner.

Respects `sidebarOpen` from Zustand. Collapsible on mobile.

#### [NEW] components/layout/navbar.tsx
Top bar: hamburger toggle (calls `toggleSidebar()`), breadcrumb/page title, user avatar dropdown (shows name/email/role, logout button). When `selectedUserId` is set (admin context), shows a dismissible **"Viewing as: [User Name]"** chip in the navbar with an X to clear the selection.

#### [NEW] components/layout/admin-user-selector.tsx
Admin-only sidebar component. A **searchable `Popover + Command` dropdown** listing all platform users. On selection:
1. Calls `setSelectedUser(userId)` in Zustand
2. Navigates to `/admin/dashboard`

Shows selected user's avatar, name, role badge inside the trigger button. Has a **"Clear"** (×) button to reset selection back to the platform overview.

#### [NEW] components/layout/portal-guard.tsx
Client component: reads session, checks `window.location.pathname` vs `ROLE_REDIRECT[role]`. If mismatch → `router.push(correctPath)`. Shows loading skeleton while session is pending.

---

### Phase 4 — Server Actions

All actions follow the pattern: `requireAuth()` → `Zod.parse()` → ownership check → Prisma or `serverClient`.

All data-fetching actions accept an optional `targetUserId` parameter for admin impersonation:
```typescript
// Pattern applied to: getPortfolio, getBalanceSnapshots,
//   getPositions, getBots, getExchanges, getSignalHistory
export async function getBots(targetUserId?: string) {
  const { user } = await requireAuth()
  const userId = (user.role === 'ADMIN' && targetUserId) ? targetUserId : user.id
  return prisma.bot.findMany({ where: { userId }, ... })
}
```

#### [NEW] actions/portfolio.ts
- `getPortfolio(targetUserId?)` — reads `Portfolio` for current user (or target if admin)
- `getBalanceSnapshots(days?, targetUserId?)` — for chart data

#### [NEW] actions/positions.ts
- `getPositions(status?, targetUserId?)` — paginated, role-aware
- `getPosition(positionId)` — single with orders
- `closePositionAction(positionId)` — verifies ownership, delegates to `serverClient.closePosition()`

#### [NEW] actions/bots.ts
- `getBots(targetUserId?)` — role-aware (ADMIN all/targeted, AGENT their customers', CUSTOMER own)
- `getBot(botId)` — with ownership assert
- `createBot(input, targetUserId?)` — Zod validate, check exchange ownership, generate `webhookSecret`
- `updateBot(botId, input)` — partial update
- `toggleBotStatus(botId, status)` — ACTIVE/PAUSED
- `deleteBot(botId)` — blocks if open positions exist
- `regenerateWebhookSecret(botId)`
- `triggerSignalAction(botId, action, symbol)` — delegates to Hono

#### [NEW] actions/exchanges.ts
- `getExchanges(targetUserId?)` — uses `SAFE_EXCHANGE_SELECT` (no apiKey)
- `createExchange(input, targetUserId?)` — encrypts `apiKey`+`apiSecret` before saving
- `updateExchange(exchangeId, input)` — label/positionMode only, never key fields
- `deleteExchange(exchangeId)` — blocks if active bots
- `toggleExchange(exchangeId, isActive)`

#### [NEW] actions/signals.ts
- `getSignalHistory(botId, limit?)` — last N signals for a bot

#### [NEW] actions/users.ts
- `getAllUsers()` — ADMIN only, with bot/position counts
- `assignCustomerToAgent(customerId, agentId)` — ADMIN only
- `updateUserRole(userId, role)` — ADMIN only

---

### Phase 5 — React Query Hooks

#### [NEW] hooks/use-portfolio.ts
- `usePortfolio(targetUserId?)` — polls every 30s
- `useBalanceSnapshots(days?, targetUserId?)` — stale 5 min

#### [NEW] hooks/use-positions.ts
- `usePositions(status?, targetUserId?)` — polls every 10s for OPEN
- `useClosePosition()` — mutation, invalidates `['positions']` + `['portfolio']`

#### [NEW] hooks/use-bots.ts
- `useBots(targetUserId?)`
- `useBot(botId)`
- `useCreateBot()` — mutation
- `useToggleBotStatus()` — mutation
- `useDeleteBot()` — mutation
- `useTriggerSignal()` — mutation

#### [NEW] hooks/use-exchanges.ts
- `useExchanges(targetUserId?)`
- `useCreateExchange()` — mutation
- `useDeleteExchange()` — mutation
- `useToggleExchange()` — mutation

#### [NEW] hooks/use-live-price.ts
- `useLivePrice(symbol)` — polls Binance public REST every 2s

#### [NEW] hooks/use-signals.ts
- `useSignals(botId)` — query key `['signals', botId]`

---

### Phase 6 — Shared Trading UI Components

All in `components/trading/`:

| File | Purpose |
|------|---------|
| `pnl-badge.tsx` | Green/red P&L with optional percent, sizes sm/md/lg |
| `price-ticker.tsx` | Flash animation on price update (green up, red down) |
| `risk-indicator.tsx` | SAFE/WARNING/DANGER badge from `RiskLevel` enum |
| `bot-status.tsx` | ACTIVE/PAUSED/STOPPED/ERROR dot + label |
| `signal-badge.tsx` | PENDING/PROCESSING/PROCESSED/FAILED/SKIPPED colored badge |
| `portfolio-chart.tsx` | Recharts LineChart for NAV + NetEquity over time |
| `danger-banner.tsx` | Full-width red banner when MarginAccount is DANGER |
| `position-row.tsx` | Table row: symbol, side, entry price, unrealizedPnL, status, close button |
| `bot-card.tsx` | Card: name, exchange label, pairs, trade type, status, toggle + delete actions |
| `webhook-config.tsx` | Read-only URL display + clipboard copy + TradingView message template |
| `signal-log.tsx` | Last N signals table: action, symbol, status, timestamp, error |

---

### Phase 7 — Forms

#### [NEW] forms/create-bot-form.tsx
Fields: name, exchange selector, tradeType (SPOT/MARGIN), pairs (comma-separated string → array transform), tradeAmountUsdt, leverage (shows only when MARGIN), stopLossPercent, takeProfitPercent.
Uses React Hook Form + Zod + Shadcn `Form` components + `useCreateBot()` mutation.

#### [NEW] forms/exchange-form.tsx
Fields: label, apiKey (password input with show/hide toggle), apiSecret (same). Never log or echo API keys after submit.

#### [NEW] forms/trade-form.tsx
Manual trade terminal form: symbol, side (LONG/SHORT), type (SPOT/MARGIN), amount (USDT), leverage (optional).
On submit → `triggerSignalAction(botId, action, symbol)` delegated to Hono.

---

### Phase 8 — Customer Portal Pages

#### [MODIFY] customer/layout.tsx
Server component. Gets session → if not found, `redirect('/sign-in')`. All roles can enter.

#### [NEW] customer/page.tsx
**Portfolio Dashboard** — Server component. Calls `getPortfolio()` + `getPositions('OPEN')` in `Promise.all`. Renders:
- **Portfolio stats cards**: Total Balance, Total P&L, Win Rate, Total Trades, Daily/Weekly/Monthly P&L
- **`<PortfolioChart />`** — 30-day NAV line chart
- **Open Positions table** using `<PositionRow />` components

#### [NEW] customer/bots/page.tsx
Client component. `useBots()` hook. Renders bot cards grid. "Create Bot" button opens Sheet/Dialog containing `<CreateBotForm />`. First loads existing exchanges for the dropdown.

#### [NEW] customer/bots/[botId]/page.tsx
Server component. `Promise.all([getBot(), getSignalHistory(), getPositions('OPEN')])`.
Sections:
1. **Bot Header** — name, status toggle, exchange label, pairs, tradeAmountUsdt, leverage, SL/TP
2. **`<WebhookConfig />`** — URL + payload template
3. **Current Open Position** (if exists for this bot) — live P&L via `usePositions()`
4. **`<SignalLog />`** — last 50 signals

#### [NEW] customer/positions/page.tsx
Client component. Tabs: "Open" | "History".
- Open tab: `usePositions('OPEN')` with close button on each row (AlertDialog confirm → `useClosePosition()`)
- History tab: `usePositions('CLOSED')` paginated table with P&L column

#### [NEW] customer/terminal/page.tsx
Manual trade terminal. Left: `<TradeForm />` with live price ticker (`useLivePrice(symbol)`). Right: bot selector (which bot to route the manual signal through). Shows current open position for selected symbol.

#### [NEW] customer/settings/page.tsx
Two sections:
1. **Exchange API Keys**: list of exchanges (`useExchanges()`), `<ExchangeForm />` to add new, toggle active/inactive, delete with confirm dialog (+DangerBanner if no active exchange)
2. **Profile**: name/email display (Better Auth user, read-only email)

---

### Phase 9 — Agent Portal Pages

#### [MODIFY] agent/layout.tsx
Server component. Gets session → role must be `AGENT` or `ADMIN`, else `redirect('/customer')`.

#### [NEW] agent/page.tsx
Agent overview: total assigned customers count, their active bots count, total open positions across all customers. Links to customer list.

#### [NEW] agent/customers/page.tsx
Table of assigned customers: name, email, active bots count, open positions count. Each row links to `[userId]`.

#### [NEW] agent/customers/[userId]/page.tsx
Read-only customer portfolio view. Reuses the same portfolio stats + bots + positions components as the customer portal but scoped to the target userId.

---

### Phase 10 — Admin Portal Pages

> **Key Design: Admin "Customer Context" Pattern**
>
> The admin sidebar has a **Customer Selector** (`<AdminUserSelector />`) instead of a static nav group. Selecting a user lets the admin view **and operate** that user's full dashboard — bots, positions, exchanges, portfolio, signals — as if they were that person. Clearing the selector returns to the global platform overview.

#### Folder structure for admin:
```
admin/
├── layout.tsx              ← ADMIN guard
├── page.tsx                ← Global platform overview (no user selected)
├── dashboard/
│   └── page.tsx            ← Impersonated user full dashboard
└── users/
    ├── page.tsx            ← All users table
    └── [userId]/
        └── page.tsx        ← User mgmt: role + agent assignment
```

#### [MODIFY] admin/layout.tsx
Server component. Role must be `ADMIN`, else `redirect('/customer')`.

#### [NEW] admin/page.tsx
**Global Platform Overview** — the default page when no user is selected. Shows aggregate stats:
- Total users (broken down: CUSTOMER / AGENT / ADMIN count)
- Total active bots across all users
- Total open positions across all users
- Platform-wide realized P&L (sum of all portfolios)
- Top 5 most active users (by bot/trade count)
- Quick CTA: "Select a customer →" which opens the `<AdminUserSelector />`

#### [NEW] admin/dashboard/page.tsx
**Impersonated User Dashboard** — reads `selectedUserId` from Zustand and renders the full customer experience for that user. The admin has **full write access**.

Top of page shows a non-dismissible **admin context banner**:
```
🛡 Admin View — Viewing as: John Doe (CUSTOMER)  [× Clear]
```

| Section | Data Source | Admin Can |
|---------|------------|-----------|
| Portfolio stats | `getPortfolio(selectedUserId)` | View only |
| 30-day NAV chart | `getBalanceSnapshots(selectedUserId)` | View only |
| Bots grid | `getBots(selectedUserId)` | Create, toggle, delete |
| Open positions | `getPositions('OPEN', selectedUserId)` | View + force-close |
| Closed positions | `getPositions('CLOSED', selectedUserId)` | View |
| Exchanges | `getExchanges(selectedUserId)` | Add / toggle / delete |
| Signal log | `getSignalHistory(botId, selectedUserId)` | View |

If `selectedUserId` is null (no user selected), this page redirects to `/admin`.

#### [NEW] admin/users/page.tsx
Full users table from `getAllUsers()`. Columns: avatar, name, email, role badge, assigned agent, active bot count, open position count. Each row has two action buttons:
- **"Manage"** → `/admin/users/[userId]` (role/agent assignment)
- **"View Dashboard"** → sets `setSelectedUser(userId)` + navigates to `/admin/dashboard`

#### [NEW] admin/users/[userId]/page.tsx
User management detail:
- **Role selector** (CUSTOMER / AGENT / ADMIN) → `updateUserRole()` server action
- **Agent assignment dropdown** (list of all AGENTs) → `assignCustomerToAgent()` server action
- **"Open Full Dashboard"** button → `setSelectedUser(userId)` + push to `/admin/dashboard`
- Read-only summary: their join date, total trades, last login

#### Admin Sidebar Nav Structure
```
📊 Platform Overview        /admin
👥 All Users                /admin/users
──────────────────────────
👤 View As Customer:
  [ Search users... ▼ ]    ← AdminUserSelector
  When selected:
  📈 Portfolio              /admin/dashboard
  🤖 Bots                   /admin/dashboard
  📉 Positions              /admin/dashboard
  💱 Exchanges              /admin/dashboard
  📡 Signals                /admin/dashboard
```

---

## Environment Variables Needed

```env
# client/.env.local
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=          # Min 32 chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=              # 32-byte hex (same as server)
SERVER_API_URL=http://localhost:3001
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

---

## Implementation Order (Dependencies First)

```
Phase 1  → lib files, middleware, providers, error pages
Phase 2  → auth pages (depend on auth-client)
Phase 3  → layout shell (depend on auth-client, ui-store)
Phase 4  → server actions (depend on auth-helpers, prisma, server-client, encryption)
Phase 5  → hooks (depend on actions)
Phase 6  → trading components (depend on hooks, utils)
Phase 7  → forms (depend on actions, hooks, shadcn Form)
Phase 8  → customer portal pages (depend on everything above)
Phase 9  → agent portal pages (depend on same components, scoped queries)
Phase 10 → admin portal pages (depend on ADMIN-only actions)
```

---

## Verification Plan

> Run `bun run dev` (or `npm run dev`) in `client/` directory, navigate to `http://localhost:3000`.

1. **Auth flow** — sign-up → redirect to `/customer`; unauthenticated visit to `/customer` → redirect to `/sign-in`
2. **Role redirect** — CUSTOMER lands `/customer`, AGENT lands `/agent`, ADMIN lands `/admin`; wrong-role access is blocked
3. **Customer Portal** — add exchange (keys encrypted in DB), create bot (webhookSecret shown), toggle bot status, positions tabs render, terminal loads
4. **Agent Portal** — `/agent/customers` shows only assigned customers; customer detail is read-only
5. **Admin Portal** — users table shows all users; role/agent update persists; `<AdminUserSelector />` opens, selecting a user shows their full dashboard with admin banner; clearing returns to `/admin`
6. **Error handling** — deleting exchange with active bots shows error toast; `npx tsc --noEmit` passes with no type errors

---

## Key Rules (Do Not Violate)

- **Never select `apiKey` or `apiSecret` in any Prisma query** — always use `SAFE_EXCHANGE_SELECT`
- **Never call `serverClient` from a client component** — only from Server Actions
- **No API routes except `/api/auth/[...betterauth]`** — all data ops = Server Actions
- **Zustand = UI state only** — never put Prisma / server data in Zustand (`selectedUserId` is UI state, not data)
- **Always scope DB queries by `userId`** — never return other users' data (CUSTOMER role)
- **Do not retry `serverClient` calls** — a retry could double-execute a Binance order
- **Keep `(main)` folder name** — do not rename route groups, it breaks Next.js routing
