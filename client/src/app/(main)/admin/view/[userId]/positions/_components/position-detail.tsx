"use client"

import { useMemo, useState } from "react"
import { Copy, Check, ShieldCheck, Bot, Clock, ArrowDownRight, ArrowUpRight, X, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  cn,
  calculatePnl,
  calculateRoi,
  copyToClipboard,
  formatCurrency,
  formatPrice,
  formatQuantity,
  formatPercent,
  formatDateTime as formatDate,
} from "@/lib/utils"
// ── Props ──

interface PositionDetailProps {
  position: any
  orders: any[]
}

// ── Clipboard helper is now in utils.ts ──

// ── Small Badge Helpers ──

function PurposeBadge({ purpose }: { purpose: string }) {
  const styles: Record<string, string> = {
    ENTRY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    EXIT: "border-orange-500/30 bg-orange-500/10 text-orange-600",
    STOP_LOSS: "border-red-500/30 bg-red-500/10 text-red-600",
    TAKE_PROFIT: "border-blue-500/30 bg-blue-500/10 text-blue-600",
    BORROW: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    REPAY: "border-teal-500/30 bg-teal-500/10 text-teal-600",
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0",
        styles[purpose] || ""
      )}
    >
      {purpose.replace("_", " ")}
    </Badge>
  )
}

function OrderSideBadge({ side }: { side: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0",
        side === "BUY"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-red-500/30 bg-red-500/10 text-red-600"
      )}
    >
      {side}
    </Badge>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    FILLED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    OPEN: "border-blue-500/30 bg-blue-500/10 text-blue-600",
    CANCELED: "border-muted-foreground/30 bg-muted text-muted-foreground",
    REJECTED: "border-red-500/30 bg-red-500/10 text-red-600",
    ERROR: "border-red-500/30 bg-red-500/10 text-red-600",
    PARTIALLY_FILLED: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    EXPIRED: "border-muted-foreground/30 bg-muted text-muted-foreground",
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0",
        styles[status] || ""
      )}
    >
      {status.replace("_", " ")}
    </Badge>
  )
}

// ── Label ──

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

// ── Main Component ──

export function PositionDetail({ position, orders }: PositionDetailProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedId(id)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedId(null), 2000)
    }
  }
  const pnlValue = Number(
    position.status === "OPEN" ? position.unrealizedPnl : position.realizedPnl
  ) || 0
  const pnlIsPositive = pnlValue >= 0

  // Calculate total volume from real orders
  // If status is CLOSED, show gross size (entry value) instead of summing all orders (double volume)
  const totalVolume = useMemo(() => {
    if (position.status === "CLOSED" || position.status === "PARTIALLY_CLOSED") {
      // For closed, typically we just want to show the size of the position handled
      return (Number(position.quantity) || 0) * (Number(position.entryPrice) || 0)
    }
    // For OPEN, fallback to current notional or same logic
    return (Number(position.quantity) || 0) * (Number(position.entryPrice) || 0)
  }, [position.quantity, position.entryPrice, position.status])

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-0">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              pnlIsPositive ? "bg-emerald-500/10" : "bg-red-500/10"
            )}
          >
            {pnlIsPositive ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-card-foreground">
                {position.symbol}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider px-2 py-0",
                  position.tradeType === "MARGIN"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                    : "border-orange-500/30 bg-orange-500/10 text-orange-600"
                )}
              >
                {position.tradeType}
              </Badge>
            </div>
            {position.bot?.name && (
              <span className="text-xs text-muted-foreground">
                {position.bot.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {position.bot?.name && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bot Managed
              </span>
              <span className="text-xs font-semibold text-card-foreground">
                {position.bot.name}
              </span>
            </div>
          )}
          <div className="text-right">
            <DetailLabel>Position ID</DetailLabel>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 font-mono text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleCopy(position.id, "pos-id")}
            >
              {position.id}
              {copiedId === "pos-id" ? (
                <Check className="ml-1 h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="ml-1 h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
        <div>
          <DetailLabel>{"ROI / P&L"}</DetailLabel>
          <p
            className={cn(
              "mt-0.5 text-lg font-bold",
              pnlIsPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {formatPercent(Number(position.pnlPercent))}
            <span className="ml-1.5 text-sm font-medium">
              {"("}
              {formatCurrency(pnlValue)}
              {")"}
            </span>
          </p>
        </div>
        <div>
          <DetailLabel>Entry Price</DetailLabel>
          <p className="mt-0.5 text-lg font-bold text-card-foreground">
            {formatPrice(Number(position.entryPrice))}
          </p>
        </div>
        <div>
          <DetailLabel>
            {position.status === "OPEN" ? "Current Price" : "Exit Price"}
          </DetailLabel>
          <p className="mt-0.5 text-lg font-bold text-card-foreground">
            {position.status === "OPEN"
              ? formatPrice(Number(position.currentPrice || position.entryPrice))
              : formatPrice(Number(position.exitPrice))}
          </p>
        </div>
        <div>
          <DetailLabel>Leverage</DetailLabel>
          <p className="mt-0.5 text-lg font-bold text-primary">
            {position.leverage}x
          </p>
        </div>
      </div>

      {/* ── Risk Management + System & Automation ── */}
      <div className="grid grid-cols-1 gap-4 px-5 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-card-foreground">
              Risk Management
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <DetailLabel>Stop Loss</DetailLabel>
              <p
                className={cn(
                  "mt-0.5 text-sm font-medium",
                  position.slPrice || position.stopLossOrderId
                    ? "text-card-foreground"
                    : "text-muted-foreground/60"
                )}
              >
                {position.slPrice
                  ? formatPrice(Number(position.slPrice))
                  : position.stopLossOrderId ? "Active" : "Not Set"}
              </p>
            </div>
            <div>
              <DetailLabel>Take Profit</DetailLabel>
              <p
                className={cn(
                  "mt-0.5 text-sm font-medium",
                  position.tpPrice || position.takeProfitOrderId
                    ? "text-card-foreground"
                    : "text-muted-foreground/60"
                )}
              >
                {position.tpPrice
                  ? formatPrice(Number(position.tpPrice))
                  : position.takeProfitOrderId ? "Active" : "Not Set"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-card-foreground">
              {"System & Automation"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <DetailLabel>Source</DetailLabel>
              <p className="mt-0.5 text-sm font-medium text-primary">
                {position.bot?.name ? "Bot Managed" : "Manual Trade"}
              </p>
            </div>
            <div>
              <DetailLabel>Account Type</DetailLabel>
              <p className="mt-0.5 text-sm font-semibold text-card-foreground">
                {position.tradeType === "MARGIN"
                  ? `MARGIN (${position.marginType || "CROSS"})`
                  : "SPOT"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trade Timeline ── */}
      <div className="p-5">
        <p className="text-sm font-semibold text-card-foreground">
          {"Trade Timeline & Execution"}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-border p-4 md:grid-cols-3">
          {/* Entry */}
          <div className="flex gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                Initial Entry
              </p>
              <DetailLabel>Entry Price</DetailLabel>
              <p className="text-sm font-bold text-card-foreground">
                {formatPrice(Number(position.entryPrice))}
              </p>
              <div className="mt-1.5">
                <DetailLabel>Execution Time</DetailLabel>
                <p className="text-xs font-medium text-card-foreground">
                  {formatDate(position.openedAt)}
                </p>
              </div>
            </div>
          </div>
          {/* Exit / Active */}
          <div className="flex gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                {position.status === "OPEN" ? "Active" : "Exit / Realization"}
              </p>
              <DetailLabel>
                {position.status === "OPEN" ? "Current Price" : "Exit Price"}
              </DetailLabel>
              <p className="text-sm font-bold text-card-foreground">
                {position.status === "OPEN"
                  ? formatPrice(Number(position.currentPrice || position.entryPrice))
                  : formatPrice(Number(position.exitPrice))}
              </p>
              {position.closedAt && (
                <div className="mt-1.5">
                  <DetailLabel>Closed At</DetailLabel>
                  <p className="text-xs font-medium text-card-foreground">
                    {formatDate(position.closedAt)}
                  </p>
                </div>
              )}
              {position.status === "OPEN" && (
                <p className="mt-1.5 text-xs font-medium text-primary">
                  Position Active
                </p>
              )}
            </div>
          </div>
          {/* Size */}
          <div className="flex gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                {"Size & Exposure"}
              </p>
              <DetailLabel>Gross Quantity</DetailLabel>
              <p className="text-sm font-bold text-card-foreground">
                {formatQuantity(Number(position.quantity))}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <DetailLabel>Side</DetailLabel>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0",
                    position.side === "LONG"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-red-500/30 bg-red-500/10 text-red-600"
                  )}
                >
                  {position.side}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order History ── */}
      {orders.length > 0 && (
        <div className="px-5 pb-5">
          <p className="text-sm font-semibold text-card-foreground">
            Order History
          </p>
          <div className="mt-3 rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Order ID
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Price
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Filled
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {order.binanceOrderId
                            ? `${order.binanceOrderId.slice(0, 12)}...`
                            : order.id.slice(0, 12)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            handleCopy(
                              order.binanceOrderId || order.id,
                              order.id
                            )
                          }
                        >
                          {copiedId === order.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <PurposeBadge purpose={order.purpose} />
                        <OrderSideBadge side={order.side} />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-card-foreground">
                      {formatPrice(Number(order.avgFillPrice || order.price))}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-card-foreground">
                      {formatQuantity(Number(order.quantity))}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono text-xs text-card-foreground">
                          {formatQuantity(Number(order.filledQuantity))}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          {order.fillPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  {"Side: "}
                  <span
                    className={cn(
                      "font-semibold",
                      position.side === "LONG"
                        ? "text-emerald-600"
                        : "text-red-500"
                    )}
                  >
                    {position.side}
                  </span>
                </span>
                {orders[0]?.sideEffect &&
                  orders[0].sideEffect !== "NO_SIDE_EFFECT" && (
                    <span className="text-muted-foreground">
                      {"System: "}
                      <span className="font-medium text-card-foreground">
                        {orders[0].sideEffect.replace(/_/g, " ")}
                      </span>
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Total Volume
                </span>
                <span className="text-sm font-bold text-card-foreground">
                  {"$"}
                  {totalVolume.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
