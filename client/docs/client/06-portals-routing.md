# 06 — Portal Pages & Routing

## Route Structure

```
/login                    → (auth) layout — public
/register                 → (auth) layout — public

/(dashboard)              → Protected by middleware.ts
  /customer               → CUSTOMER default landing
    /                     → Portfolio dashboard
    /bots                 → Bot list
    /bots/[botId]         → Bot detail + webhook config + signal log
    /positions            → Open & closed positions
    /terminal             → Manual trade terminal
    /settings             → Exchange API keys, profile

  /agent                  → AGENT only
    /                     → Agent overview
    /customers            → Assigned customer list
    /customers/[userId]   → View customer portfolio (read only)

  /admin                  → ADMIN only
    /                     → Platform overview
    /users                → All users
    /users/[userId]       → User detail + role + agent assignment
```

---

## Route Guard Pattern

Use a layout-level guard to enforce role-based access:

```tsx
// client/app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { auth }     from '@/lib/auth'
import { headers }  from 'next/headers'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session)                    redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/customer')

  return <>{children}</>
}
```

```tsx
// client/app/(dashboard)/agent/layout.tsx
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')
  if (!['ADMIN', 'AGENT'].includes(session.user.role)) redirect('/customer')

  return <>{children}</>
}
```

```tsx
// client/app/(dashboard)/customer/layout.tsx
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  // All roles can access customer — agents view customer portal for their clients
  return <>{children}</>
}
```

---

## Page Patterns

### Server Component Page (data fetched server-side)
```tsx
// client/app/(dashboard)/customer/page.tsx
import { getPortfolio }       from '@/app/actions/portfolio'
import { getPositions }       from '@/app/actions/positions'
import { PortfolioStats }     from '@/components/trading/portfolio-stats'
import { OpenPositionsTable } from '@/components/trading/open-positions-table'

// ✅ Fetch data directly in the server component — no useEffect, no loading state
export default async function CustomerDashboard() {
  const [portfolio, openPositions] = await Promise.all([
    getPortfolio(),
    getPositions('OPEN'),
  ])

  return (
    <div className="space-y-6">
      <PortfolioStats portfolio={portfolio} />
      <OpenPositionsTable positions={openPositions} />
    </div>
  )
}
```

### Client Component Page (needs interactivity / live data)
```tsx
// client/app/(dashboard)/customer/positions/page.tsx
'use client'
import { usePositions } from '@/hooks/use-positions'
import { PositionsTable } from '@/components/trading/positions-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function PositionsPage() {
  const { data: open,   isLoading: openLoading }   = usePositions('OPEN')
  const { data: closed, isLoading: closedLoading } = usePositions('CLOSED')

  return (
    <Tabs defaultValue="open">
      <TabsList>
        <TabsTrigger value="open">Open ({open?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="closed">History</TabsTrigger>
      </TabsList>
      <TabsContent value="open">
        <PositionsTable positions={open ?? []} loading={openLoading} />
      </TabsContent>
      <TabsContent value="closed">
        <PositionsTable positions={closed ?? []} loading={closedLoading} />
      </TabsContent>
    </Tabs>
  )
}
```

---

## Sidebar Navigation (Role-Aware)

```tsx
// client/components/layout/sidebar.tsx
'use client'
import { useSession } from '@/lib/auth-client'
import Link from 'next/link'
import { LayoutDashboard, Bot, TrendingUp, Terminal, Settings, Users } from 'lucide-react'

const NAV = {
  CUSTOMER: [
    { href: '/customer',           label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/customer/bots',      label: 'Bots',       icon: Bot },
    { href: '/customer/positions', label: 'Positions',  icon: TrendingUp },
    { href: '/customer/terminal',  label: 'Terminal',   icon: Terminal },
    { href: '/customer/settings',  label: 'Settings',   icon: Settings },
  ],
  AGENT: [
    { href: '/agent',             label: 'Overview',   icon: LayoutDashboard },
    { href: '/agent/customers',   label: 'Customers',  icon: Users },
  ],
  ADMIN: [
    { href: '/admin',             label: 'Overview',   icon: LayoutDashboard },
    { href: '/admin/users',       label: 'Users',      icon: Users },
  ],
}

export function Sidebar() {
  const { data: session } = useSession()
  if (!session) return null

  const role = session.user.role as keyof typeof NAV
  const links = NAV[role] ?? NAV.CUSTOMER

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm">
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

---

## Bot Detail Page — Key Sections

The bot detail page is the most complex in the customer portal. It contains:

1. **Bot config summary** — name, pairs, trade amount, leverage, SL/TP
2. **Webhook URL & secret** — displayed for TradingView setup
3. **Status toggle** — ACTIVE / PAUSED button
4. **Open position** — current position if one exists
5. **Signal history** — last 50 signals with status

```tsx
// client/app/(dashboard)/customer/bots/[botId]/page.tsx
import { getBot }           from '@/app/actions/bots'
import { getSignalHistory } from '@/app/actions/signals'
import { getPositions }     from '@/app/actions/positions'
import { BotHeader }        from '@/components/trading/bot-header'
import { WebhookConfig }    from '@/components/trading/webhook-config'
import { SignalLog }        from '@/components/trading/signal-log'
import { notFound }         from 'next/navigation'

export default async function BotDetailPage({ params }: { params: { botId: string } }) {
  const [bot, signals, openPositions] = await Promise.all([
    getBot(params.botId),
    getSignalHistory(params.botId),
    getPositions('OPEN'),
  ])

  if (!bot) notFound()

  const botPosition = openPositions.find(p => p.botId === bot.id)

  return (
    <div className="space-y-6">
      <BotHeader bot={bot} />
      <WebhookConfig botId={bot.id} secret={bot.webhookSecret} />
      {botPosition && <CurrentPosition position={botPosition} />}
      <SignalLog signals={signals} />
    </div>
  )
}
```

---

## Webhook URL Display

Show the TradingView webhook URL in the bot settings:

```tsx
// client/components/trading/webhook-config.tsx
'use client'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const APP_URL = process.env.NEXT_PUBLIC_SERVER_URL  // Your Hono server public URL

export function WebhookConfig({ botId, secret }: { botId: string; secret: string | null }) {
  const webhookUrl = `${APP_URL}/webhooks/bot/${botId}`

  const examplePayload = JSON.stringify({
    secret:  secret ?? 'your-secret',
    action:  '{{strategy.order.action}}',  // TradingView variable
    symbol:  '{{ticker}}',
  }, null, 2)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Webhook URL</label>
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} />
          <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Message Template (paste into TradingView alert)</label>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{examplePayload}</pre>
      </div>
    </div>
  )
}
```
