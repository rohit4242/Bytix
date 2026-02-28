"use client"

import { BotStatus } from "@/generated/prisma"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function BotStatusBadge({ status, className }: { status: BotStatus; className?: string }) {
    const config = {
        [BotStatus.ACTIVE]: { label: "Active", className: "bg-green-500/10 text-green-500 border-green-500/20" },
        [BotStatus.PAUSED]: { label: "Paused", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
        [BotStatus.STOPPED]: { label: "Stopped", className: "bg-red-500/10 text-red-500 border-red-500/20" },
        [BotStatus.ERROR]: { label: "Error", className: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" },
    }

    const { label, className: statusClass } = config[status] || { label: status, className: "bg-muted text-muted-foreground" }

    return (
        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 h-4 leading-none border-2", statusClass, className)}>
            {label}
        </Badge>
    )
}
