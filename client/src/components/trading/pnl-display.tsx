"use client"

import { cn, formatPnl, formatPercent } from "@/lib/utils"

interface PnlDisplayProps {
    value: number
    percent: number
    className?: string
    showPercent?: boolean
}

export function PnlDisplay({ value, percent, className, showPercent = true }: PnlDisplayProps) {
    const isPositive = value >= 0

    return (
        <div className={cn("inline-flex flex-col items-start leading-tight", className)}>
            <span className={cn(
                "font-mono font-bold",
                isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
                {formatPnl(value)}
            </span>
            {showPercent && (
                <span className={cn(
                    "text-[10px] font-black tracking-widest uppercase opacity-70",
                    isPositive ? "text-emerald-500/80" : "text-rose-500/80"
                )}>
                    {formatPercent(percent)}
                </span>
            )}
        </div>
    )
}
