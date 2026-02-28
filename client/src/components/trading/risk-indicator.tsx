import { cn } from "@/lib/utils"
import { RiskLevel } from "@/types"

const config: Record<RiskLevel, { label: string; classes: string; icon: string }> = {
    SAFE: { label: "Safe", icon: "✓", classes: "bg-green-500/10 text-green-400 border-green-500/20" },
    WARNING: { label: "Warning", icon: "⚠", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    DANGER: { label: "Danger", icon: "✕", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
}

interface RiskIndicatorProps {
    level: RiskLevel
    className?: string
}

export function RiskIndicator({ level, className }: RiskIndicatorProps) {
    const c = config[level]
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                c.classes,
                className
            )}
        >
            <span>{c.icon}</span>
            {c.label}
        </span>
    )
}
