import { cn, formatPnl, formatPercent, pnlColor } from "@/lib/utils"

interface PnlBadgeProps {
    value: number | string
    percent?: number | string
    size?: "sm" | "md" | "lg"
    showIcon?: boolean
}

const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1",
}

export function PnlBadge({
    value,
    percent,
    size = "md",
    showIcon = true,
}: PnlBadgeProps) {
    const n = Number(value)
    const isPositive = n > 0
    const isNegative = n < 0

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full font-mono font-semibold",
                sizeClasses[size],
                isPositive && "bg-green-500/10 text-green-400",
                isNegative && "bg-red-500/10 text-red-400",
                !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}
        >
            {showIcon && (
                <span className="text-xs">{isPositive ? "▲" : isNegative ? "▼" : "–"}</span>
            )}
            {formatPnl(value)}
            {percent !== undefined && (
                <span className="opacity-70">({formatPercent(percent)})</span>
            )}
        </span>
    )
}
