import { cn } from "@/lib/utils"
import { BotStatus } from "@/types"

interface BotStatusProps {
    status: BotStatus
    showLabel?: boolean
    size?: "sm" | "md"
}

const config: Record<BotStatus, { label: string; dot: string; text: string }> = {
    ACTIVE: { label: "Active", dot: "bg-green-400 shadow-green-400/50", text: "text-green-400" },
    PAUSED: { label: "Paused", dot: "bg-yellow-400 shadow-yellow-400/50", text: "text-yellow-400" },
    STOPPED: { label: "Stopped", dot: "bg-muted-foreground", text: "text-muted-foreground" },
    ERROR: { label: "Error", dot: "bg-red-400 shadow-red-400/50", text: "text-red-400" },
}

export function BotStatusBadge({ status, showLabel = true, size = "md" }: BotStatusProps) {
    const c = config[status]
    return (
        <span className="inline-flex items-center gap-1.5">
            <span
                className={cn(
                    "rounded-full shadow-sm",
                    c.dot,
                    size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
                    // Pulse animation only for ACTIVE
                    status === "ACTIVE" && "animate-pulse"
                )}
            />
            {showLabel && (
                <span className={cn("font-medium", c.text, size === "sm" ? "text-xs" : "text-sm")}>
                    {c.label}
                </span>
            )}
        </span>
    )
}
