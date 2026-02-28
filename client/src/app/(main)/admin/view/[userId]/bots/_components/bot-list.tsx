"use client"

import { Button } from "@/components/ui/button"
import { BotCard } from "./bot-card"
import { Bot } from "@/generated/prisma"

interface BotListProps {
    bots: Bot[]
    userId: string
    onAdd: () => void
    onEdit: (bot: Bot) => void
    onToggle: (id: string, active: boolean) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onViewWebhook: (bot: Bot) => void
    onManualTrigger: (bot: Bot) => void
}

export function BotList({ bots, userId, onAdd, onEdit, onToggle, onDelete, onViewWebhook, onManualTrigger }: BotListProps) {
    if (!bots || !bots.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-card/50">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-xl">🤖</span>
                </div>
                <h4 className="text-sm font-bold">No Bots Found</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-6">
                    This user hasn&apos;t setup any trading strategies yet.
                </p>
                <Button onClick={onAdd} size="sm">
                    Setup First Bot
                </Button>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
                <BotCard
                    key={bot.id}
                    bot={bot}
                    onToggle={onToggle}
                    onDelete={() => onDelete(bot.id)}
                    onEdit={() => onEdit(bot)}
                    onViewWebhook={() => onViewWebhook(bot)}
                    onManualTrigger={() => onManualTrigger(bot)}
                />
            ))}
        </div>
    )
}
