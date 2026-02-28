"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { TradeSide, PositionStatus, TradeType } from "@/app/actions/positions/types"

export function SideBadge({ side }: { side: TradeSide }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                side === "LONG"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
            )}
        >
            {side}
        </Badge>
    )
}

export function StatusBadge({ status }: { status: PositionStatus }) {
    const styles: Record<PositionStatus, string> = {
        OPEN: "border-primary/30 bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary),0.1)]",
        CLOSED: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
        PARTIALLY_CLOSED: "border-amber-500/30 bg-amber-500/10 text-amber-500",
        LIQUIDATED: "border-rose-600/30 bg-rose-600/10 text-rose-600 font-bold",
    }
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5",
                styles[status] || ""
            )}
        >
            {status.replace("_", " ")}
        </Badge>
    )
}

export function TypeBadge({ type }: { type: TradeType }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                type === "MARGIN"
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                    : "border-orange-500/30 bg-orange-500/10 text-orange-400"
            )}
        >
            {type}
        </Badge>
    )
}
