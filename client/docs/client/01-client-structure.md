# 01 — Client App Structure & Setup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router, Turbopack) |
| Auth | Better Auth |
| Database | Prisma ORM (shared PostgreSQL) |
| Styling | Tailwind CSS |
| Components | Shadcn UI + Radix UI |
| Animations | Framer Motion |
| Server State | React Query (TanStack) |
| Client State | Zustand |
| HTTP (to server/) | Axios |
| Charts | Recharts + TradingView Widgets |
| Forms | React Hook Form + Zod |

---

## Folder Structure

```
client/
├── app/
│   ├── (auth)/                         ← Auth pages (not protected)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx                  ← Auth layout (no sidebar)
│   │
│   ├── (dashboard)/                    ← Protected pages
│   │   ├── layout.tsx                  ← Dashboard layout (sidebar, navbar)
│   │   ├── admin/                      ← ADMIN role only
│   │   │   ├── page.tsx                ← Admin overview
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   └── agents/
│   │   │       └── page.tsx
│   │   ├── agent/                      ← AGENT role only
│   │   │   ├── page.tsx                ← Agent overview
│   │   │   └── customers/
│   │   │       └── page.tsx
│   │   └── customer/                   ← CUSTOMER role (default)
│   │       ├── page.tsx                ← Portfolio dashboard
│   │       ├── bots/
│   │       │   ├── page.tsx            ← Bot list
│   │       │   └── [botId]/
│   │       │       └── page.tsx        ← Bot detail + signal history
│   │       ├── positions/
│   │       │   └── page.tsx            ← Open & closed positions
│   │       ├── terminal/
│   │       │   └── page.tsx            ← Manual trade terminal
│   │       └── settings/
│   │           └── page.tsx            ← Exchanges, profile
│   │
│   ├── actions/                        ← ALL Server Actions live here
│   │   ├── portfolio.ts
│   │   ├── positions.ts
│   │   ├── bots.ts
│   │   ├── exchanges.ts
│   │   ├── users.ts
│   │   └── signals.ts
│   │
│   └── api/
│       └── auth/
│           └── [...betterauth]/
│               └── route.ts            ← ONLY API route allowed
│
├── components/
│   ├── ui/                             ← Shadcn components (do not edit)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/                         ← App shell components
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   └── portal-guard.tsx            ← Role-based redirect
│   ├── trading/                        ← Custom trading UI
│   │   ├── bot-card.tsx
│   │   ├── position-row.tsx
│   │   ├── pnl-badge.tsx
│   │   ├── risk-indicator.tsx
│   │   ├── price-ticker.tsx
│   │   └── portfolio-chart.tsx
│   └── forms/                          ← Reusable form components
│       ├── create-bot-form.tsx
│       ├── exchange-form.tsx
│       └── trade-form.tsx
│
├── lib/
│   ├── auth.ts                         ← Better Auth config & instance
│   ├── auth-helpers.ts                 ← requireAuth(), requireRole()
│   ├── prisma.ts                       ← Prisma client singleton
│   ├── server-client.ts                ← HTTP client to call server/ (Hono)
│   ├── encryption.ts                   ← AES-256-GCM encrypt/decrypt
│   └── utils.ts                        ← cn(), formatCurrency(), etc.
│
├── hooks/
│   ├── use-portfolio.ts                ← React Query hooks
│   ├── use-positions.ts
│   ├── use-bots.ts
│   └── use-live-price.ts              ← Polling for live prices
│
├── stores/
│   └── ui-store.ts                    ← Zustand (sidebar open, modals, etc.)
│
├── types/
│   └── index.ts                       ← Shared TypeScript types
│
├── prisma/
│   └── schema.prisma                  ← Must stay identical to server/prisma/schema.prisma
│
├── middleware.ts                       ← Next.js route protection
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Environment Variables

```env
# client/.env.local

DATABASE_URL=postgresql://user:pass@host:5432/bytix

# Better Auth
BETTER_AUTH_SECRET=your-secret-here         # Min 32 chars, random
BETTER_AUTH_URL=http://localhost:3000        # Your Next.js URL

# Encryption (same key as server/)
ENCRYPTION_KEY=your-32-byte-hex-key         # openssl rand -hex 32

# Hono backend
SERVER_API_URL=http://localhost:3001         # Your Hono server URL
```

---

## Package Setup

```json
// client/package.json — key dependencies
{
  "dependencies": {
    "next": "^14.0.0",
    "better-auth": "latest",
    "@prisma/client": "latest",
    "@tanstack/react-query": "latest",
    "zustand": "latest",
    "axios": "latest",
    "zod": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    "recharts": "latest",
    "framer-motion": "latest",
    "tailwindcss": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "prisma": "latest",
    "typescript": "latest"
  }
}
```

---

## next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Required for Server Actions
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
}

export default nextConfig
```

---

## middleware.ts — Route Protection

```typescript
// client/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PUBLIC_ROUTES  = ['/', '/login', '/register']
const ADMIN_ROUTES   = ['/admin']
const AGENT_ROUTES   = ['/agent']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Check session cookie
  const sessionCookie = getSessionCookie(req)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role-based route protection happens in portal-guard.tsx (client component)
  // Middleware only checks if logged in — role redirect happens in layout
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## lib/prisma.ts

```typescript
// client/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## lib/utils.ts

```typescript
// client/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Decimal } from '@prisma/client/runtime/library'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: Decimal | number | string, decimals = 2) {
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatPnl(value: Decimal | number) {
  const n = Number(value)
  const prefix = n > 0 ? '+' : ''
  return `${prefix}${formatCurrency(n)}`
}

export function pnlColor(value: Decimal | number) {
  const n = Number(value)
  if (n > 0) return 'text-green-400'
  if (n < 0) return 'text-red-400'
  return 'text-muted-foreground'
}

export function formatPercent(value: Decimal | number) {
  const n = Number(value)
  const prefix = n > 0 ? '+' : ''
  return `${prefix}${n.toFixed(2)}%`
}
```
