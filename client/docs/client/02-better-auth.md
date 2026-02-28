# 02 — Better Auth Setup

## Overview

Better Auth handles all authentication in `client/`. It manages sessions, OAuth providers, credential login, and email verification. `server/` does NOT manage auth — it only verifies the session token from the shared DB.

---

## lib/auth.ts — Core Config

```typescript
// client/lib/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Session config
  session: {
    expiresIn:          60 * 60 * 24 * 7,   // 7 days
    updateAge:          60 * 60 * 24,        // Refresh if older than 1 day
    cookieCache: {
      enabled:  true,
      maxAge:   60 * 5,                      // Cache session for 5 min
    },
  },

  // Email + password login
  emailAndPassword: {
    enabled:          true,
    requireEmailVerification: false,          // Set true in production
    minPasswordLength: 8,
  },

  // Add OAuth providers here if needed
  // socialProviders: {
  //   google: { clientId: ..., clientSecret: ... }
  // },

  // Attach role to user on creation
  user: {
    additionalFields: {
      role: {
        type:         'string',
        defaultValue: 'CUSTOMER',
        input:        false,                 // Cannot be set by user on signup
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session.user
```

---

## app/api/auth/[...betterauth]/route.ts

```typescript
// client/app/api/auth/[...betterauth]/route.ts
// This is the ONLY API route in the client app
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

---

## lib/auth-helpers.ts — Server-Side Helpers

These are used inside Server Actions to verify the session.

```typescript
// client/lib/auth-helpers.ts
import { auth } from './auth'
import { headers } from 'next/headers'
import { prisma } from './prisma'

// Use in every Server Action — throws if not logged in
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) throw new AuthError('Not authenticated')
  return session
}

// Use when a route requires a specific role
export async function requireRole(...roles: ('ADMIN' | 'AGENT' | 'CUSTOMER')[]) {
  const session = await requireAuth()
  if (!roles.includes(session.user.role as any)) {
    throw new AuthError(`Access denied. Requires: ${roles.join(' or ')}`)
  }
  return session
}

// Check if a bot belongs to the current user (or their customer if agent)
export async function assertBotOwnership(userId: string, userRole: string, botId: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId } })
  if (!bot) throw new NotFoundError('Bot not found')

  if (userRole === 'ADMIN') return bot

  if (userRole === 'CUSTOMER') {
    if (bot.userId !== userId) throw new AuthError('Access denied')
    return bot
  }

  if (userRole === 'AGENT') {
    const customer = await prisma.user.findFirst({
      where: { id: bot.userId, agentId: userId }
    })
    if (!customer) throw new AuthError('Not your customer')
    return bot
  }

  throw new AuthError('Access denied')
}

// Check if an exchange belongs to the current user
export async function assertExchangeOwnership(userId: string, userRole: string, exchangeId: string) {
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    select: { id: true, userId: true, label: true, name: true, isActive: true }
    // ⚠️ Never select apiKey or apiSecret
  })
  if (!exchange) throw new NotFoundError('Exchange not found')
  if (userRole !== 'ADMIN' && exchange.userId !== userId) throw new AuthError('Access denied')
  return exchange
}

// Custom error classes
export class AuthError extends Error {
  status = 401
  constructor(message: string) { super(message) }
}

export class NotFoundError extends Error {
  status = 404
  constructor(message: string) { super(message) }
}

export class ValidationError extends Error {
  status = 400
  constructor(message: string) { super(message) }
}
```

---

## Auth Pages

### Login Page
```tsx
// client/app/(auth)/login/page.tsx
'use client'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await authClient.signIn.email({ email, password })

    if (error) {
      toast.error(error.message ?? 'Login failed')
      setLoading(false)
      return
    }

    router.push('/customer')  // Redirect handled by portal-guard
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input value={email}    onChange={e => setEmail(e.target.value)}    type="email"    placeholder="Email" />
      <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
```

### lib/auth-client.ts — Browser-Side Auth
```typescript
// client/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

// Re-export hooks for convenience
export const { useSession, signIn, signOut, signUp } = authClient
```

---

## Role-Based Portal Guard

After login, redirect the user to the correct portal based on their role.

```tsx
// client/components/layout/portal-guard.tsx
'use client'
import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ROLE_REDIRECT = {
  ADMIN:    '/admin',
  AGENT:    '/agent',
  CUSTOMER: '/customer',
} as const

export function PortalGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.push('/login')
      return
    }
    // If on root or wrong portal, redirect to correct one
    const correctPath = ROLE_REDIRECT[session.user.role as keyof typeof ROLE_REDIRECT]
    if (!window.location.pathname.startsWith(correctPath)) {
      router.push(correctPath)
    }
  }, [session, isPending])

  if (isPending) return <div>Loading...</div>
  if (!session)  return null

  return <>{children}</>
}
```

---

## Getting Session in Server Components & Actions

```typescript
// In any Server Action or server component:
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

// Full session object
const session = await auth.api.getSession({ headers: await headers() })

// Or use the helper (throws if not authenticated):
import { requireAuth } from '@/lib/auth-helpers'
const session = await requireAuth()

// Access user data:
session.user.id
session.user.email
session.user.role      // 'ADMIN' | 'AGENT' | 'CUSTOMER'
session.user.name
session.session.token  // Bearer token for server/ calls
```

---

## Logout

```tsx
// In any client component
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await authClient.signOut()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Sign Out</button>
}
```
