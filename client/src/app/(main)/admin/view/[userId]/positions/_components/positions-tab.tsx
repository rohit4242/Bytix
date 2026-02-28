"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  X,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getPositions, closePositionDbOnly, closePositionBinance } from "@/app/actions/positions"
import { toast } from "sonner"
import { PositionTable } from "./position-table"
import {
  type MockPosition,
  type TradeSide,
  type TradeType,
} from "@/lib/position-mock-data"
// ── Types ──

type SideFilter = "ALL" | TradeSide
type TypeFilter = "ALL" | TradeType

// ── Stat Card ──

function StatCard({
  label,
  value,
  valueClassName,
  icon: Icon,
}: {
  label: string
  value: string
  valueClassName?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-lg font-bold truncate",
            valueClassName || "text-card-foreground"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Format helpers ──

function formatStatCurrency(value: number): string {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value >= 0 ? "+" : "-"}$${formatted}`
}

import {
  cn,
  calculatePnl,
  calculateRoi,
  formatCurrency,
  formatPercent,
} from "@/lib/utils"

// ── Real Live P/L Ticker Hook ──

function usePositionsLivePrices(positions: any[]): any[] {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const wsRef = useRef<WebSocket | null>(null)

  const openPositions = useMemo(
    () => positions.filter((p) => p.status === "OPEN"),
    [positions]
  )
  const symbols = useMemo(
    () => Array.from(new Set(openPositions.map((p) => p.symbol.toLowerCase()))),
    [openPositions]
  )

  useEffect(() => {
    if (symbols.length === 0) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    // Connect to Binance multi-stream for all symbols
    const streams = symbols.map((s) => `${s}@ticker`).join("/")
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`
    )
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const symbol = msg.data.s // e.g., "BTCUSDT"
      const currentPrice = Number(msg.data.c)
      setPrices((prev) => ({ ...prev, [symbol]: currentPrice }))
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [symbols])

  return useMemo(() => {
    return positions.map((p) => {
      if (p.status !== "OPEN") return p
      const currentPrice = prices[p.symbol] || Number(p.currentPrice || p.entryPrice)

      const pnl = calculatePnl({
        side: p.side,
        entryPrice: Number(p.entryPrice),
        currentPrice,
        quantity: Number(p.quantity),
      })

      const roi = calculateRoi({
        pnl,
        quantity: Number(p.quantity),
        entryPrice: Number(p.entryPrice),
        leverage: Number(p.leverage),
      })

      return {
        ...p,
        currentPrice,
        unrealizedPnl: pnl,
        pnlPercent: roi,
      }
    })
  }, [positions, prices])
}

// ── Main Component ──

export function PositionsTab(
  { userId, initialPositions }: { userId: string; initialPositions: any[] }
) {
  const [allPositions, setAllPositions] = useState<any[]>(initialPositions)
  const [searchQuery, setSearchQuery] = useState("")
  const [sideFilter, setSideFilter] = useState<SideFilter>("ALL")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false)
  const [closeAllType, setCloseAllType] = useState<"BINANCE" | "DB">("BINANCE")
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null)

  // Split into open vs closed
  const openPositions = useMemo(
    () => allPositions.filter((p) => p.status === "OPEN"),
    [allPositions]
  )
  const closedPositions = useMemo(
    () => allPositions.filter((p) => p.status !== "OPEN"),
    [allPositions]
  )

  // Live price ticker for open positions
  const liveOpenPositions = usePositionsLivePrices(openPositions)

  // Filter logic
  const filterPositions = useCallback(
    (positions: any[]) => {
      return positions.filter((p) => {
        const botName = p.bot?.name || ""
        const matchesSearch =
          !searchQuery ||
          p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          botName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesSide = sideFilter === "ALL" || p.side === sideFilter
        const matchesType = typeFilter === "ALL" || p.tradeType === typeFilter
        return matchesSearch && matchesSide && matchesType
      })
    },
    [searchQuery, sideFilter, typeFilter]
  )

  const filteredOpen = useMemo(
    () => filterPositions(liveOpenPositions),
    [liveOpenPositions, filterPositions]
  )
  const filteredClosed = useMemo(
    () => filterPositions(closedPositions),
    [closedPositions, filterPositions]
  )

  // Stats (derived from live data for open, raw data for closed)
  const totalOpenCount = liveOpenPositions.length
  const totalUnrealizedPnl = liveOpenPositions.reduce(
    (sum: number, p: any) => sum + (Number(p.unrealizedPnl) || 0),
    0
  )
  const totalRealizedPnl = closedPositions.reduce(
    (sum: number, p: any) => sum + (Number(p.realizedPnl) || 0),
    0
  )
  const winningTrades = closedPositions.filter((p: any) => Number(p.realizedPnl) > 0).length
  const winRate =
    closedPositions.length > 0
      ? (winningTrades / closedPositions.length) * 100
      : 0

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      const freshPositions = await getPositions(userId)
      setAllPositions(freshPositions)
    } catch (err) {
      console.error("Failed to refresh positions:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Actions
  async function handleCloseBinance(positionId: string) {
    setClosingPositionId(positionId)
    toast.promise(closePositionBinance(positionId, userId), {
      loading: "Closing position on Binance...",
      success: (result) => {
        if (result.success) {
          handleRefresh()
          return "Position closed on Binance"
        }
        throw new Error(result.error || "Failed to close position")
      },
      error: (err) => err.message || "Failed to close position on Binance",
      finally: () => setClosingPositionId(null),
    })
  }

  async function handleCloseDbOnly(positionId: string) {
    setClosingPositionId(positionId)
    toast.promise(closePositionDbOnly(positionId), {
      loading: "Marking position as CLOSED in DB...",
      success: (result) => {
        if (result.success) {
          handleRefresh()
          return "Position marked as CLOSED in DB"
        }
        throw new Error("Failed to update database")
      },
      error: "Failed to update database",
      finally: () => setClosingPositionId(null),
    })
  }

  async function handleCloseAll() {
    setShowCloseAllDialog(false)
    setIsRefreshing(true)

    const promise = (async () => {
      if (closeAllType === "BINANCE") {
        for (const p of openPositions) {
          await closePositionBinance(p.id, userId)
        }
        return `Closed ${openPositions.length} positions on Binance`
      } else {
        for (const p of openPositions) {
          await closePositionDbOnly(p.id)
        }
        return `Marked ${openPositions.length} positions as CLOSED in DB`
      }
    })()

    toast.promise(promise, {
      loading: closeAllType === "BINANCE" ? "Closing all positions on Binance..." : "Closing all positions in DB...",
      success: (msg) => {
        handleRefresh()
        return msg
      },
      error: "Failed to close all positions",
      finally: () => setIsRefreshing(false),
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            POSITION MANAGEMENT
          </h1>
          <p className="mt-1 text-sm tracking-wide text-muted-foreground">
            TRACK AND MANAGE ALL TRADING POSITIONS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Positions"
          value={String(totalOpenCount)}
          icon={Activity}
        />
        <StatCard
          label="Unrealized P/L"
          value={formatStatCurrency(totalUnrealizedPnl)}
          valueClassName={
            totalUnrealizedPnl >= 0 ? "text-emerald-600" : "text-red-500"
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(winRate, 1).replace("+", "")}
          valueClassName="text-primary"
          icon={BarChart3}
        />
        <StatCard
          label="Realized P/L"
          value={formatStatCurrency(totalRealizedPnl)}
          valueClassName={
            totalRealizedPnl >= 0 ? "text-emerald-600" : "text-red-500"
          }
          icon={TrendingDown}
        />
      </div>

      {/* Tabs + Filters */}
      <Tabs defaultValue="live" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger
                value="live"
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Live Positions
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                  {filteredOpen.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="text-xs font-semibold uppercase tracking-wider"
              >
                History
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                  {filteredClosed.length}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Close All (only on Live) */}
            {liveOpenPositions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setCloseAllType("BINANCE")
                    setShowCloseAllDialog(true)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Close All (Binance)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                  onClick={() => {
                    setCloseAllType("DB")
                    setShowCloseAllDialog(true)
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Close All (DB Only)
                </Button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search symbol or bot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 pl-8 text-xs"
              />
            </div>
            <Select
              value={sideFilter}
              onValueChange={(v) => setSideFilter(v as SideFilter)}
            >
              <SelectTrigger size="sm" className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sides</SelectItem>
                <SelectItem value="LONG">Long</SelectItem>
                <SelectItem value="SHORT">Short</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            >
              <SelectTrigger size="sm" className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="SPOT">Spot</SelectItem>
                <SelectItem value="MARGIN">Margin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="live" className="mt-4">
          <PositionTable
            positions={filteredOpen}
            isLive
            onForceClose={handleCloseBinance}
            onDbClose={handleCloseDbOnly}
            closingPositionId={closingPositionId}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PositionTable positions={filteredClosed} showClosedDate />
        </TabsContent>
      </Tabs>

      {/* Close All Confirmation Dialog */}
      <AlertDialog
        open={showCloseAllDialog}
        onOpenChange={setShowCloseAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {closeAllType === "BINANCE" ? "Close All on Binance" : "Close All (DB Only)"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closeAllType === "BINANCE" ? (
                <>
                  You are about to force close{" "}
                  <span className="font-semibold text-foreground">
                    {liveOpenPositions.length}
                  </span>{" "}
                  open position{liveOpenPositions.length !== 1 ? "s" : ""} on **Binance**.
                  This will execute market orders immediately.
                </>
              ) : (
                <>
                  You are about to mark{" "}
                  <span className="font-semibold text-foreground">
                    {liveOpenPositions.length}
                  </span>{" "}
                  open position{liveOpenPositions.length !== 1 ? "s" : ""} as **CLOSED** in the database.
                  **No Binance orders will be placed.**
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseAll}
              className={cn(
                closeAllType === "BINANCE"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              )}
            >
              Confirm {closeAllType === "BINANCE" ? "Binance Close All" : "DB Only Close All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
