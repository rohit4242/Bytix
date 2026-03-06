"use client"

import { useState } from "react"
import { Clock, SquarePen, Trash, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { type SanitizedExchange, syncExchange } from "@/app/actions/exchanges"

interface ExchangeCardProps {
    exchange: SanitizedExchange
    onToggle?: (id: string, active: boolean) => void
    onEdit?: (id: string) => void
    onDelete?: (id: string) => void
}

export function ExchangeCard({ exchange, onToggle, onEdit, onDelete }: ExchangeCardProps) {
    const [syncing, setSyncing] = useState(false)
    const [lastSynced, setLastSynced] = useState(
        new Date(exchange.updatedAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
    )

    async function handleSync() {
        setSyncing(true)
        const toastId = toast.loading("Syncing with Binance...")
        try {
            const result = await syncExchange(exchange.id)
            if (result.success) {
                setLastSynced(new Date().toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }))
                toast.success("Balances synced successfully", { id: toastId })
            } else {
                console.error("Sync failed:", result.error)
                toast.error(result.error || "Sync failed. Check your API keys.", { id: toastId })
            }
        } catch (error: any) {
            console.error("Sync caught error:", error)
            toast.error("Internal connection error. Please try again.", { id: toastId })
        } finally {
            setSyncing(false)
        }
    }

    // Derived values for breakdown
    const totalUsdValue = exchange.totalValue
    const spotValue = exchange.spotUsd
    const marginValue = exchange.marginUsd

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-card-foreground">{exchange.name}</span>
                        <Badge
                            variant="outline"
                            className={
                                exchange.positionMode === "HEDGE"
                                    ? "border-orange-300 bg-orange-50 text-orange-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                                    : "border-blue-300 bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                            }
                        >
                            {exchange.positionMode}
                        </Badge>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            exchange.isActive
                                ? "border-primary/30 bg-primary/5 text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5"
                                : "border-muted-foreground/30 bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5"
                        }
                    >
                        {exchange.isActive ? "ENABLED" : "DISABLED"}
                    </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{exchange.label}</p>
            </div>

            {/* Total Balance */}
            <div className="px-5 pt-5 pb-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-opacity-70">Total Balance</p>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-bold text-card-foreground">$</span>
                    <p className="text-2xl font-bold tracking-tight text-card-foreground">
                        {totalUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Breakdown */}
            <div className="mx-5 mb-5 grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Spot Account</p>
                    <p className="mt-1 text-base font-bold text-indigo-600">
                        ${spotValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="p-3 bg-emerald-50/40 border border-emerald-100/50 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Margin Account</p>
                    <p className="mt-1 text-base font-bold text-emerald-600">
                        ${marginValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Metadata rows */}
            <div className="mx-5 mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last Synced
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{lastSynced}</span>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-1 rounded-md border border-border bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                            aria-label="Sync balance"
                        >
                            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Syncing..." : "Sync"}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="font-medium uppercase tracking-wider text-muted-foreground">Active Strategies</span>
                    <span className="font-semibold text-primary">
                        {exchange._count?.bots || 0} {"Bots"}
                    </span>
                </div>
            </div>

            {/* Footer with toggle + actions */}
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <Switch
                        checked={exchange.isActive}
                        onCheckedChange={(checked) => onToggle?.(exchange.id, checked)}
                        className="data-[state=checked]:bg-primary scale-90"
                    />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit?.(exchange.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label="Edit exchange"
                    >
                        <SquarePen className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete?.(exchange.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete exchange"
                    >
                        <Trash className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

