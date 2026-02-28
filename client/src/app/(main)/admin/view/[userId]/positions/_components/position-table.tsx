"use client"

import { useState, useMemo, useCallback } from "react"
import {
  ChevronDown,
  RefreshCw,
  X,
  Loader2,
  Inbox, // Inbox is used in the empty state, so not removing it.
} from "lucide-react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PositionDetail } from "./position-detail"
import {
  cn,
  formatCurrency,
  formatPrice,
  formatQuantity,
  formatPercent,
  formatDateTime as formatDate,
  calculatePnl,
  calculateRoi,
  copyToClipboard,
} from "@/lib/utils"

// ── Constants ──
const ROWS_PER_PAGE = 10

// ── Badge Components ──

function SideBadge({ side }: { side: "LONG" | "SHORT" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0",
        side === "LONG"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-red-500/30 bg-red-500/10 text-red-600"
      )}
    >
      {side}
    </Badge>
  )
}

function TypeBadge({ type }: { type: "SPOT" | "MARGIN" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0",
        type === "MARGIN"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
          : "border-orange-500/30 bg-orange-500/10 text-orange-600"
      )}
    >
      {type}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "border-primary/30 bg-primary/10 text-primary",
    CLOSED: "border-muted-foreground/30 bg-muted text-muted-foreground",
    PARTIALLY_CLOSED: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    LIQUIDATED: "border-red-500/30 bg-red-500/10 text-red-600",
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
        styles[status] || ""
      )}
    >
      {status.replace("_", " ")}
    </Badge>
  )
}

// ── Props ──

interface PositionTableProps {
  positions: any[]
  showClosedDate?: boolean
  isLive?: boolean
  onForceClose?: (id: string) => void
  onDbClose?: (id: string) => void
  closingPositionId?: string | null
}

// ── Main Component ──

export function PositionTable({
  positions,
  showClosedDate = false,
  isLive = false,
  onForceClose,
  onDbClose,
  closingPositionId,
}: PositionTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmAction, setConfirmAction] = useState<null | { type: "BINANCE" | "DB"; position: any }>(null)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(positions.length / ROWS_PER_PAGE))
  const paginatedPositions = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return positions.slice(start, start + ROWS_PER_PAGE)
  }, [positions, currentPage])

  // Reset page when data changes
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage
  if (safeCurrentPage !== currentPage) setCurrentPage(safeCurrentPage)

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function handleConfirmClose() {
    if (confirmAction) {
      if (confirmAction.type === "BINANCE" && onForceClose) {
        onForceClose(confirmAction.position.id)
      } else if (confirmAction.type === "DB" && onDbClose) {
        onDbClose(confirmAction.position.id)
      }
    }
    setConfirmAction(null)
  }

  // ── Empty State ──
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">No positions found</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Positions will appear here when trades are executed.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-8" />
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Symbol
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Side
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Entry Price
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {showClosedDate ? "Exit Price" : "Current Price"}
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quantity
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {"P/L %"}
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                P/L USD
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {showClosedDate ? "Closed At" : "Opened At"}
              </TableHead>
              {isLive && (
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPositions.map((position) => {
              const isExpanded = expandedIds.has(position.id)
              const orders = position.orders || []
              const pnlValue =
                position.status === "OPEN"
                  ? position.unrealizedPnl
                  : position.realizedPnl
              const pnlIsPositive = pnlValue >= 0

              return (
                <PositionAccordionRow
                  key={position.id}
                  position={position}
                  orders={orders}
                  isExpanded={isExpanded}
                  showClosedDate={showClosedDate}
                  isLive={isLive}
                  pnlValue={Number(pnlValue)}
                  pnlIsPositive={Number(pnlValue) >= 0}
                  onToggle={() => toggleExpand(position.id)}
                  onForceClose={onForceClose ? () => setConfirmAction({ type: "BINANCE", position }) : undefined}
                  onDbClose={onDbClose ? () => setConfirmAction({ type: "DB", position }) : undefined}
                  closingPositionId={closingPositionId}
                />
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}
              {"-"}
              {Math.min(currentPage * ROWS_PER_PAGE, positions.length)} of{" "}
              {positions.length} positions
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="text-xs h-7 px-2.5"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="text-xs h-7 w-7 p-0"
                  >
                    {page}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="text-xs h-7 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Force Close Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "BINANCE" ? "Force Close on Binance" : "Close (DB Only)"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "BINANCE" ? (
                <>
                  Are you sure you want to force close the{" "}
                  <span className="font-semibold text-foreground">
                    {confirmAction?.position.symbol}
                  </span>{" "}
                  <span
                    className={
                      confirmAction?.position.side === "LONG"
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-red-500"
                    }
                  >
                    {confirmAction?.position.side}
                  </span>{" "}
                  position? This will execute a market order on **Binance** immediately.
                </>
              ) : (
                <>
                  This will mark the{" "}
                  <span className="font-semibold text-foreground">
                    {confirmAction?.position.symbol}
                  </span>{" "}
                  position as **CLOSED** in the database only. **No Binance API call will be made.**
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              className={cn(
                confirmAction?.type === "BINANCE"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              )}
            >
              Confirm {confirmAction?.type === "BINANCE" ? "Binance Close" : "DB Only Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Accordion Row (renders trigger row + collapsible detail) ──

function PositionAccordionRow({
  position,
  orders,
  isExpanded,
  showClosedDate,
  isLive,
  pnlValue,
  pnlIsPositive,
  onToggle,
  onForceClose,
  onDbClose,
  closingPositionId,
}: {
  position: any
  orders: any[]
  isExpanded: boolean
  showClosedDate: boolean
  isLive: boolean
  pnlValue: number
  pnlIsPositive: boolean
  onToggle: () => void
  onForceClose?: () => void
  onDbClose?: () => void
  closingPositionId?: string | null
}) {
  const botName = position.bot?.name
  return (
    <>
      {/* Main Row */}
      <TableRow
        className={cn(
          "cursor-pointer transition-colors",
          isExpanded && "bg-muted/30"
        )}
        onClick={onToggle}
      >
        <TableCell className="pr-0 w-8">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </TableCell>
        <TableCell>
          <div>
            <span className="text-sm font-semibold text-card-foreground">
              {position.symbol}
            </span>
            {botName && (
              <p className="text-[10px] text-muted-foreground">
                {botName}
              </p>
            )}
          </div>
        </TableCell>
        <TableCell>
          <SideBadge side={position.side} />
        </TableCell>
        <TableCell>
          <TypeBadge type={position.tradeType} />
        </TableCell>
        <TableCell className="font-mono text-xs text-card-foreground">
          {formatPrice(Number(position.entryPrice))}
        </TableCell>
        <TableCell className="font-mono text-xs text-card-foreground">
          {showClosedDate
            ? formatPrice(Number(position.exitPrice))
            : formatPrice(Number(position.currentPrice || position.entryPrice))}
        </TableCell>
        <TableCell className="font-mono text-xs text-card-foreground">
          {formatQuantity(Number(position.quantity))}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              pnlIsPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {formatPercent(Number(position.pnlPercent))}
          </span>
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              pnlIsPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {formatCurrency(pnlValue)}
          </span>
        </TableCell>
        <TableCell>
          <StatusBadge status={position.status} />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {showClosedDate
            ? formatDate(position.closedAt)
            : formatDate(position.openedAt)}
        </TableCell>
        {isLive && (
          <TableCell className="text-right">
            <div className="flex items-center gap-1.5 p-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onForceClose?.()
                }}
                disabled={closingPositionId === position.id}
              >
                {closingPositionId === position.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDbClose?.()
                }}
                disabled={closingPositionId === position.id}
              >
                {closingPositionId === position.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>

      {/* Accordion Detail Row */}
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={isLive ? 12 : 11}
            className="p-0"
          >
            <div className="border-t border-border bg-muted/10 px-4 py-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <PositionDetail position={position} orders={orders} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
