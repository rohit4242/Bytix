# 09 — State Management

## Two Types of State

| Type | Tool | Use For |
|------|------|---------|
| Server state (DB data) | React Query | Positions, portfolio, bots, signals — anything from Prisma |
| UI state | Zustand | Sidebar open/close, active modal, theme, temporary UI state |

---

## React Query Setup

```tsx
// client/app/layout.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:        30 * 1000,     // 30s — data stays fresh
        refetchOnFocus:   true,
        retry:            1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## React Query Hooks

```typescript
// client/hooks/use-portfolio.ts
import { useQuery } from '@tanstack/react-query'
import { getPortfolio, getBalanceSnapshots } from '@/app/actions/portfolio'

export function usePortfolio() {
  return useQuery({
    queryKey:        ['portfolio'],
    queryFn:         getPortfolio,
    refetchInterval: 30_000,   // Poll every 30s for live portfolio stats
  })
}

export function useBalanceSnapshots(days = 30) {
  return useQuery({
    queryKey: ['balance-snapshots', days],
    queryFn:  () => getBalanceSnapshots(days),
    staleTime: 5 * 60 * 1000,  // 5 min — snapshots don't change often
  })
}
```

```typescript
// client/hooks/use-positions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPositions, closePositionAction }      from '@/app/actions/positions'
import { toast } from 'sonner'

export function usePositions(status?: 'OPEN' | 'CLOSED' | 'LIQUIDATED') {
  return useQuery({
    queryKey:        ['positions', status],
    queryFn:         () => getPositions(status),
    // Poll open positions more frequently for live P&L
    refetchInterval: status === 'OPEN' ? 10_000 : false,
  })
}

export function useClosePosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (positionId: string) => closePositionAction(positionId),
    onSuccess: () => {
      // Invalidate both open positions and portfolio after close
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      toast.success('Position closed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

```typescript
// client/hooks/use-bots.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBots, createBot, toggleBotStatus, deleteBot } from '@/app/actions/bots'
import { toast } from 'sonner'

export function useBots() {
  return useQuery({
    queryKey: ['bots'],
    queryFn:  getBots,
  })
}

export function useCreateBot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBot,
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      toast.success('Bot created!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useToggleBotStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ botId, status }: { botId: string; status: 'ACTIVE' | 'PAUSED' }) =>
      toggleBotStatus(botId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bots'] }),
    onError:   (e: Error) => toast.error(e.message),
  })
}
```

```typescript
// client/hooks/use-live-price.ts
import { useQuery } from '@tanstack/react-query'

// Polling for live price — no WebSocket in client/
export function useLivePrice(symbol: string) {
  return useQuery({
    queryKey:        ['price', symbol],
    queryFn:         () => fetchPrice(symbol),  // Your price API or Binance public REST
    refetchInterval: 2_000,   // Poll every 2s
    enabled:         !!symbol,
  })
}

async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  )
  const data = await res.json()
  return parseFloat(data.price)
}
```

---

## Query Key Conventions

Always use consistent query keys so `invalidateQueries` works correctly:

```typescript
['portfolio']                      // User's portfolio stats
['balance-snapshots', days]        // Chart data
['positions']                      // All positions (any status)
['positions', 'OPEN']              // Open only
['positions', 'CLOSED']            // Closed only
['position', positionId]           // Single position detail
['bots']                           // All bots
['bot', botId]                     // Single bot detail
['signals', botId]                 // Bot signal history
['exchanges']                      // Exchange list
['price', symbol]                  // Live price for a symbol
['margin', exchangeId]             // Margin account data
```

---

## Zustand — UI State Only

```typescript
// client/stores/ui-store.ts
import { create } from 'zustand'

interface UIStore {
  sidebarOpen:   boolean
  activeModal:   string | null
  toggleSidebar: () => void
  openModal:     (id: string) => void
  closeModal:    () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen:   true,
  activeModal:   null,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:     (id) => set({ activeModal: id }),
  closeModal:    () => set({ activeModal: null }),
}))
```

**Zustand is for UI state only** — never put DB data in Zustand. Use React Query for anything that comes from Prisma or the server.

---

## Invalidation After Server Actions

After any mutation that changes data, invalidate the related queries:

```typescript
// After closing a position:
queryClient.invalidateQueries({ queryKey: ['positions'] })
queryClient.invalidateQueries({ queryKey: ['portfolio'] })

// After creating a bot:
queryClient.invalidateQueries({ queryKey: ['bots'] })

// After adding an exchange:
queryClient.invalidateQueries({ queryKey: ['exchanges'] })

// After admin changes a user role:
queryClient.invalidateQueries({ queryKey: ['users'] })
```
