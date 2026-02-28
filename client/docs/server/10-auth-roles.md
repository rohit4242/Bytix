# 10 — Auth, Sessions & Role Rules

## How Authentication Works Across Both Apps

Bytix AI uses **Better Auth** in both `client/` and `server/`. Since both apps share the same PostgreSQL database, the session token created by Better Auth in `client/` can be verified directly by `server/` via a Prisma DB lookup — no JWT, no shared secret for auth, no duplicated session logic.

---

## Three Auth Mechanisms (One Per Caller Type)

| Caller | Destination | Method |
|--------|------------|--------|
| Browser → `client/` | Next.js pages & Server Actions | Better Auth cookie session (automatic) |
| `client/` Server Action → `server/` | `/positions/*` `/internal/*` `/margin/*` | `Authorization: Bearer <session.token>` verified in DB |
| TradingView → `server/` | `/webhooks/bot/:botId` | `payload.secret` matched against `bot.webhookSecret` |

---

## How It Works: client/ → server/

Better Auth stores every session in the `Session` table with a `token` field. Since `server/` shares the same DB, it can look up that token directly — no JWT parsing, no shared secret for auth.

```
User logs into client/ via Better Auth
  → Session created: { token: "sess_abc123...", userId: "...", expiresAt: "..." }
  → Stored in PostgreSQL Session table

User triggers "Close Position" in UI
  → Server Action calls getAuthHeaders()
  → Gets session.token from Better Auth
  → Sends: Authorization: Bearer sess_abc123...
  → Hono authMiddleware receives it
  → Looks up token in Session table via Prisma
  → Verifies not expired
  → Attaches user to context → route handler runs
```

---

## Implementation

### `client/lib/server-client.ts`
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import axios from 'axios'

const SERVER_URL = process.env.SERVER_API_URL  // http://localhost:3001

async function getAuthHeaders() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!session) throw new Error('Not authenticated')

  return {
    'Authorization': `Bearer ${session.session.token}`,
    'Content-Type': 'application/json',
  }
}

export const serverClient = {
  // Position actions
  closePosition: async (positionId: string) => {
    const h = await getAuthHeaders()
    return axios.post(`${SERVER_URL}/positions/${positionId}/close`, {}, { headers: h })
  },

  syncPosition: async (positionId: string) => {
    const h = await getAuthHeaders()
    return axios.get(`${SERVER_URL}/positions/${positionId}/sync`, { headers: h })
  },

  // Manual signal trigger from UI
  triggerSignal: async (botId: string, action: string, symbol: string) => {
    const h = await getAuthHeaders()
    return axios.post(`${SERVER_URL}/internal/signal`, { botId, action, symbol }, { headers: h })
  },

  // Margin sync
  syncMargin: async (exchangeId: string) => {
    const h = await getAuthHeaders()
    return axios.post(`${SERVER_URL}/margin/${exchangeId}/sync`, {}, { headers: h })
  },
}
```

---

### `server/src/middleware/auth.ts`
```typescript
import { prisma } from '../lib/prisma'
import type { Context, Next } from 'hono'

// Extend Hono context type to include user
type Variables = {
  user: {
    id: string
    email: string
    role: 'ADMIN' | 'AGENT' | 'CUSTOMER'
    name: string | null
    agentId: string | null
  }
  sessionToken: string
}

export async function authMiddleware(c: Context<{ Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — missing Bearer token' }, 401)
  }

  const token = authHeader.replace('Bearer ', '').trim()

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!session) {
    return c.json({ error: 'Invalid session token' }, 401)
  }

  if (session.expiresAt < new Date()) {
    return c.json({ error: 'Session expired' }, 401)
  }

  // Attach to context for use in route handlers
  c.set('user', session.user)
  c.set('sessionToken', token)

  await next()
}
```

---

### `server/src/middleware/require-role.ts`
```typescript
import type { Context, Next } from 'hono'

export function requireRole(...roles: ('ADMIN' | 'AGENT' | 'CUSTOMER')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (!roles.includes(user.role)) {
      return c.json({ error: `Requires role: ${roles.join(' or ')}` }, 403)
    }
    await next()
  }
}
```

---

### Using Middleware in Hono Routes
```typescript
// server/src/routes/positions.ts
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/require-role'

export const positionRoutes = new Hono()

// All position routes require a valid session
positionRoutes.use('*', authMiddleware)

// Close position — any role can close their own
positionRoutes.post('/:positionId/close', async (c) => {
  const user = c.get('user')
  const { positionId } = c.req.param()

  const position = await prisma.position.findUnique({ where: { id: positionId } })
  if (!position) return c.json({ error: 'Not found' }, 404)

  // Ownership check
  await assertPositionOwnership(user, position)

  // ... close position logic
})

// Admin-only: force close any position
positionRoutes.post('/:positionId/force-close', requireRole('ADMIN'), async (c) => {
  // ...
})
```

```typescript
// server/src/routes/webhooks.ts
// ⚠️ NO authMiddleware here — webhook auth is via payload.secret only
import { Hono } from 'hono'

export const webhookRoutes = new Hono()

webhookRoutes.post('/bot/:botId', async (c) => {
  const payload = await c.req.json()
  const bot = await prisma.bot.findUnique({ where: { id: c.req.param('botId') } })

  if (!bot || payload.secret !== bot.webhookSecret) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  // ... signal processing
})
```

---

## Ownership Check Helper (server/)

```typescript
// server/src/lib/ownership.ts
import { prisma } from './prisma'

export async function assertPositionOwnership(
  user: { id: string; role: string; agentId?: string | null },
  position: { userId: string }
) {
  if (user.role === 'ADMIN') return  // Admins access everything

  if (user.role === 'CUSTOMER') {
    if (position.userId !== user.id) throw new ForbiddenError('Access denied')
    return
  }

  if (user.role === 'AGENT') {
    // Agent can act on their assigned customers' positions
    const customer = await prisma.user.findFirst({
      where: { id: position.userId, agentId: user.id }
    })
    if (!customer) throw new ForbiddenError('Not your customer')
  }
}

export class ForbiddenError extends Error {
  status = 403
  constructor(message: string) { super(message) }
}
```

---

## Auth in `client/` Server Actions

```typescript
// client/lib/auth-helpers.ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  return session
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth()
  if (!roles.includes(session.user.role)) {
    throw new Error(`Requires role: ${roles.join(' or ')}`)
  }
  return session
}
```

```typescript
// client/app/actions/bots.ts — typical Server Action pattern
'use server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function getBots() {
  const session = await requireAuth()
  const { user } = session

  if (user.role === 'ADMIN') {
    return prisma.bot.findMany({ include: { exchange: { select: { label: true } } } })
  }

  if (user.role === 'AGENT') {
    const customers = await prisma.user.findMany({
      where: { agentId: user.id }, select: { id: true }
    })
    return prisma.bot.findMany({
      where: { userId: { in: customers.map(c => c.id) } }
    })
  }

  // CUSTOMER — own bots only
  return prisma.bot.findMany({ where: { userId: user.id } })
}
```

---

## Role Hierarchy & Permission Matrix

```
ADMIN
  └─ Full access to all users, data, settings, any position

AGENT
  └─ View/manage assigned customers' bots, positions, portfolios
  └─ Cannot see other agents' customers
  └─ Cannot modify platform settings

CUSTOMER
  └─ Own data only — bots, positions, exchanges, portfolio
  └─ Cannot see any other user's data
```

| Action | CUSTOMER | AGENT | ADMIN |
|--------|----------|-------|-------|
| View own portfolio | ✅ | ✅ (own) | ✅ |
| View customer portfolio | ❌ | ✅ (assigned only) | ✅ |
| Create/edit own bot | ✅ | ✅ (for assigned customers) | ✅ |
| Delete bot | ✅ (own) | ❌ | ✅ |
| Add exchange API key | ✅ (own) | ❌ | ✅ |
| View exchange API key | ❌ never | ❌ never | ❌ never |
| Close own position | ✅ | ✅ (assigned customers) | ✅ |
| Force close any position | ❌ | ❌ | ✅ |
| Manage users / assign agents | ❌ | ❌ | ✅ |

> ⚠️ Exchange `apiKey` and `apiSecret` are **never returned in any response to any role, ever.**

---

## API Key Encryption (Shared by Both Apps)

Both `client/` and `server/` use the same encryption module with the same `ENCRYPTION_KEY` env var.

```typescript
// client/lib/encryption.ts  AND  server/src/lib/encryption.ts  (identical file)
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')  // 32 bytes

export function encrypt(text: string): string {
  const iv      = crypto.randomBytes(16)
  const cipher  = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag     = cipher.getAuthTag()
  // Format: iv:tag:encrypted  (all hex)
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, dataHex] = encryptedText.split(':')
  const iv       = Buffer.from(ivHex, 'hex')
  const tag      = Buffer.from(tagHex, 'hex')
  const data     = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

// Usage:
// client/ → encrypt before saving:  exchange.apiKey = encrypt(rawApiKey)
// server/ → decrypt before using:   const rawKey = decrypt(exchange.apiKey)
```
