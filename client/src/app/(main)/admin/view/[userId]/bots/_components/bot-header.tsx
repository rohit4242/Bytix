"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface BotHeaderProps {
    onAdd: () => void
}

export function BotHeader({ onAdd }: BotHeaderProps) {
    return (
        <div className="flex items-end justify-between">
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-foreground/80">
                    Bot Strategy Control
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Managing automated trading strategies and webhooks.
                </p>
            </div>
            <Button onClick={onAdd} className="h-9 gap-2 shadow-md hover:shadow-lg transition-all pr-4">
                <div className="bg-primary-foreground/20 h-5 w-5 rounded flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Create Bot</span>
            </Button>
        </div>
    )
}
