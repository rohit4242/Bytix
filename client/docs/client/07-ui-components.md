# 07 — UI Components & Patterns

## Component Library Rules

- **Shadcn/Radix** → `components/ui/` — use for all standard UI (buttons, inputs, dialogs, tables, badges)
- **Custom trading components** → `components/trading/` — only for domain-specific UI
- **Layout components** → `components/layout/` — sidebar, navbar, shell

Never modify files in `components/ui/` directly. Add new Shadcn components with `npx shadcn@latest add <component>`.

---

## Trading-Specific Components

### P&L Badge
```tsx
// client/components/trading/pnl-badge.tsx
import { cn, formatPnl, formatPercent } from '@/lib/utils'
import type { Decimal } from '@prisma/client/runtime/library'

interface PnlBadgeProps {
  value:    Decimal | number
  percent?: Decimal | number
  size?:    'sm' | 'md' | 'lg'
}

export function PnlBadge({ value, percent, size = 'md' }: PnlBadgeProps) {
  const n = Number(value)
  const color = n > 0 ? 'text-green-400' : n < 0 ? 'text-red-400' : 'text-muted-foreground'
  const sizes  = { sm: 'text-xs', md: 'text-sm', lg: 'text-base font-semibold' }

  return (
    <span className={cn(color, sizes[size])}>
      {formatPnl(value)}
      {percent !== undefined && (
        <span className="ml-1 opacity-70">({formatPercent(percent)})</span>
      )}
    </span>
  )
}
```

### Price Ticker (Flash Animation)
```tsx
// client/components/trading/price-ticker.tsx
'use client'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface PriceTickerProps {
  symbol:  string
  price:   number
}

// ✅ Local state per ticker — never global state for price flashes
export function PriceTicker({ symbol, price }: PriceTickerProps) {
  const prevPrice = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price === prevPrice.current) return
    setFlash(price > prevPrice.current ? 'up' : 'down')
    prevPrice.current = price
    const t = setTimeout(() => setFlash(null), 400)
    return () => clearTimeout(t)
  }, [price])

  return (
    <span className={cn(
      'font-mono tabular-nums transition-colors duration-300',
      flash === 'up'   && 'text-green-400',
      flash === 'down' && 'text-red-400',
      !flash           && 'text-foreground',
    )}>
      {price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
    </span>
  )
}
```

### Risk Level Indicator
```tsx
// client/components/trading/risk-indicator.tsx
import { Badge }  from '@/components/ui/badge'
import { cn }     from '@/lib/utils'

type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER'

const CONFIG = {
  SAFE:    { label: 'Safe',    class: 'bg-green-500/10 text-green-400 border-green-500/20' },
  WARNING: { label: 'Warning', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  DANGER:  { label: 'Danger',  class: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' },
}

export function RiskIndicator({ level, marginLevel }: { level: RiskLevel; marginLevel?: number | null }) {
  const config = CONFIG[level]
  return (
    <div className="flex items-center gap-2">
      <Badge className={cn('border', config.class)}>{config.label}</Badge>
      {marginLevel && (
        <span className="text-xs text-muted-foreground">
          Level: {Number(marginLevel).toFixed(2)}
        </span>
      )}
    </div>
  )
}
```

### Bot Status Dot
```tsx
// client/components/trading/bot-status.tsx
import { cn } from '@/lib/utils'

type BotStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR'

const CONFIG = {
  ACTIVE:  { label: 'Active',  dot: 'bg-green-500 animate-pulse' },
  PAUSED:  { label: 'Paused',  dot: 'bg-yellow-500' },
  STOPPED: { label: 'Stopped', dot: 'bg-gray-500' },
  ERROR:   { label: 'Error',   dot: 'bg-red-500 animate-pulse' },
}

export function BotStatus({ status }: { status: BotStatus }) {
  const { label, dot } = CONFIG[status]
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
```

### Signal Status Badge
```tsx
// client/components/trading/signal-badge.tsx
import { Badge } from '@/components/ui/badge'

type SignalStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'SKIPPED'

const VARIANTS: Record<SignalStatus, string> = {
  PENDING:    'bg-gray-500/10 text-gray-400',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  PROCESSED:  'bg-green-500/10 text-green-400',
  FAILED:     'bg-red-500/10 text-red-400',
  SKIPPED:    'bg-yellow-500/10 text-yellow-400',
}

export function SignalBadge({ status }: { status: SignalStatus }) {
  return <Badge className={VARIANTS[status]}>{status}</Badge>
}
```

### Portfolio Chart (Recharts)
```tsx
// client/components/trading/portfolio-chart.tsx
'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useBalanceSnapshots } from '@/hooks/use-portfolio'
import { formatCurrency }      from '@/lib/utils'

export function PortfolioChart({ days = 30 }: { days?: number }) {
  // ✅ Always use BalanceSnapshot for charts — never aggregate live positions
  const { data: snapshots, isLoading } = useBalanceSnapshots(days)

  if (isLoading) return <div className="h-48 animate-pulse bg-muted rounded" />

  const chartData = snapshots?.map(s => ({
    date:   new Date(s.snapshotAt).toLocaleDateString(),
    nav:    Number(s.navUsd),
    equity: Number(s.netEquity),
  })) ?? []

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => `$${v.toLocaleString()}`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Line dataKey="nav"    stroke="#22c55e" strokeWidth={2} dot={false} name="NAV" />
        <Line dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Net Equity" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## Dangerous Action Confirmation

Always use AlertDialog for destructive actions:

```tsx
// Pattern for any destructive action
import { AlertDialog, AlertDialogAction, AlertDialogCancel,
         AlertDialogContent, AlertDialogDescription,
         AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
         AlertDialogTrigger } from '@/components/ui/alert-dialog'

function DeleteBotButton({ botId, botName }: { botId: string; botName: string }) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteBotAction(botId),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{botName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this bot. Open positions will NOT be closed automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## DANGER State Banner

Show a full-width banner when margin risk is DANGER:

```tsx
// client/components/trading/danger-banner.tsx
import { AlertTriangle } from 'lucide-react'

export function DangerBanner({ marginLevel }: { marginLevel: number }) {
  return (
    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-400">Margin Account in Danger</p>
        <p className="text-xs text-red-400/70">
          Margin level is {marginLevel.toFixed(2)}. New trades are blocked.
          Add collateral or close positions to reduce risk.
        </p>
      </div>
    </div>
  )
}
```
