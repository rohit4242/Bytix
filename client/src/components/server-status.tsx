"use client"

import * as React from "react"
import { useServerStatus } from "@/hooks/use-server-status"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ServerStatusProps {
    className?: string
    showText?: boolean
}

export function ServerStatus({ className, showText = true }: ServerStatusProps) {
    const status = useServerStatus()

    const statusConfig = {
        online: {
            color: "bg-green-500",
            shadow: "shadow-[0_0_8px_rgba(34,197,94,0.6)]",
            text: "System Live",
            pulse: true
        },
        offline: {
            color: "bg-red-500",
            shadow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
            text: "System Offline",
            pulse: false
        },
        checking: {
            color: "bg-yellow-500",
            shadow: "shadow-[0_0_8px_rgba(234,179,8,0.6)]",
            text: "Checking...",
            pulse: true
        }
    }

    const current = statusConfig[status]

    return (
        <Button
            variant="outline"
            size="sm"
            className={cn(
                "h-9 gap-2 rounded-xl border-input/50 px-4 font-bold text-xs uppercase tracking-widest hover:bg-accent transition-all",
                className
            )}
        >
            <div
                className={cn(
                    "size-2 rounded-full transition-all duration-500",
                    current.color,
                    current.shadow,
                    current.pulse && "animate-pulse"
                )}
            />
            {showText && <span>{current.text}</span>}
        </Button>
    )
}
