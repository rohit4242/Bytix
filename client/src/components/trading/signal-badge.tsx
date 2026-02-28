import { cn } from "@/lib/utils"
import { SignalStatus } from "@/types"

const config: Record<SignalStatus, { label: string; classes: string }> = {
    PENDING: { label: "Pending", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    PROCESSING: { label: "Processing", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    PROCESSED: { label: "Processed", classes: "bg-green-500/10 text-green-400 border-green-500/20" },
    FAILED: { label: "Failed", classes: "bg-red-500/10 text-red-400 border-red-500/20" },
    SKIPPED: { label: "Skipped", classes: "bg-muted text-muted-foreground border-border" },
}

interface SignalBadgeProps {
    status: SignalStatus
}

export function SignalBadge({ status }: SignalBadgeProps) {
    const c = config[status]
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                c.classes
            )}
        >
            {c.label}
        </span>
    )
}
