# 11 — UI Components & Frontend Rules

## Component Library

**Always use Shadcn/Radix components from `/components/ui/` for:**
- Buttons, Inputs, Selects, Checkboxes
- Dialogs, Sheets, Popovers, Tooltips
- Tables, Cards, Badges, Alerts
- Forms (with React Hook Form + Zod)

**Only build custom components for trading-specific UI:**
- Price tickers with flash animations
- P&L display with color coding
- Risk level indicators
- Bot status cards
- TradingView chart embeds

---

## Key UI Rules

### 1. Price Flash Animations
Use local component state — never global state for price ticks:

```tsx
// ✅ CORRECT — isolated state per ticker
function PriceTicker({ symbol }: { symbol: string }) {
  const [price, setPrice]   = useState(0)
  const [flash, setFlash]   = useState<'up'|'down'|null>(null)

  useEffect(() => {
    const unsub = priceStore.subscribe(symbol, (newPrice) => {
      setFlash(newPrice > price ? 'up' : 'down')
      setPrice(newPrice)
      setTimeout(() => setFlash(null), 300)
    })
    return unsub
  }, [symbol])

  return (
    <span className={cn(
      'transition-colors duration-300',
      flash === 'up'   && 'text-green-400',
      flash === 'down' && 'text-red-400',
      !flash           && 'text-foreground'
    )}>
      {price.toFixed(2)}
    </span>
  )
}

// ❌ WRONG — causes full DOM re-render on every price tick
const globalPrice = useGlobalStore(s => s.prices[symbol])
```

### 2. P&L Color Coding
Always use these consistent classes:
```tsx
const pnlColor = (pnl: number) =>
  pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-muted-foreground'

const pnlPrefix = (pnl: number) => pnl > 0 ? '+' : ''

// Usage
<span className={pnlColor(position.realizedPnl)}>
  {pnlPrefix(position.realizedPnl)}{position.realizedPnl.toFixed(2)} USDT
</span>
```

### 3. Risk Level Badges
```tsx
const riskBadgeVariant = {
  SAFE:    'success',    // green
  WARNING: 'warning',   // yellow
  DANGER:  'destructive' // red
} as const

<Badge variant={riskBadgeVariant[marginAccount.riskLevel]}>
  {marginAccount.riskLevel}
</Badge>
```

### 4. Charts (Recharts)
Always use `BalanceSnapshot` data for time-series — never aggregate live:

```tsx
// ✅ CORRECT
const { data: snapshots } = useQuery({
  queryKey: ['balance-snapshots', userId],
  queryFn: () => api.get('/api/portfolio/snapshots')
})

<LineChart data={snapshots}>
  <Line dataKey="navUsd" stroke="#22c55e" />
  <XAxis dataKey="snapshotAt" />
  <YAxis />
  <Tooltip />
</LineChart>
```

---

## Data Fetching Patterns (React Query)

```tsx
// Always use React Query for server data
// Keys: ['resource', id, filters...]

// Fetch open positions
const { data: positions, isLoading } = useQuery({
  queryKey: ['positions', 'open'],
  queryFn:  () => axios.get('/api/positions?status=OPEN').then(r => r.data),
  refetchInterval: 10_000,  // poll every 10s for live data
})

// Mutation with optimistic update
const closePosition = useMutation({
  mutationFn: (positionId: string) =>
    axios.post(`/api/positions/${positionId}/close`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['positions'] })
    queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }
})
```

---

## Bot Status Indicator

```tsx
const botStatusConfig = {
  ACTIVE:  { label: 'Active',  color: 'bg-green-500',  pulse: true  },
  PAUSED:  { label: 'Paused',  color: 'bg-yellow-500', pulse: false },
  STOPPED: { label: 'Stopped', color: 'bg-gray-500',   pulse: false },
  ERROR:   { label: 'Error',   color: 'bg-red-500',    pulse: true  },
}

function BotStatusDot({ status }: { status: BotStatus }) {
  const config = botStatusConfig[status]
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        'h-2 w-2 rounded-full',
        config.color,
        config.pulse && 'animate-pulse'
      )} />
      <span className="text-sm">{config.label}</span>
    </div>
  )
}
```

---

## Dangerous Action Pattern (e.g. Delete Bot, Close All)

Always confirm destructive actions:

```tsx
function DeleteBotButton({ botId }: { botId: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete Bot</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this bot?</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop all automated trading. Open positions will NOT be closed automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteBot(botId)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## Form Validation (Zod + React Hook Form)

```tsx
const createBotSchema = z.object({
  name:             z.string().min(1).max(50),
  tradeType:        z.enum(['SPOT', 'MARGIN']),
  pairs:            z.array(z.string()).min(1),
  tradeAmountUsdt:  z.number().positive().min(10),
  leverage:         z.number().int().min(1).max(20),
  stopLossPercent:  z.number().min(0.1).max(50).optional(),
  takeProfitPercent: z.number().min(0.1).max(500).optional(),
})
```
