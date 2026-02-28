"use client"

import { useState } from "react"

import { Zap, Globe, TrendingUp, Settings, ExternalLink, Briefcase, MoreHorizontal, Edit, Trash, Loader2, Play } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useLivePrice } from "@/hooks/use-live-price"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface BotCardProps {
    bot: any
    onToggle: (id: string, active: boolean) => Promise<void>
    onDelete: () => void
    onEdit: () => void
    onViewWebhook: () => void
    onManualTrigger: () => void
}

export function BotCard({ bot, onToggle, onDelete, onEdit, onViewWebhook, onManualTrigger }: BotCardProps) {
    const [isToggling, setIsToggling] = useState(false)
    const { price: livePrice } = useLivePrice(bot.pairs?.[0], 0)

    // Use the status from backend: ACTIVE = true, anything else = false
    const isActive = bot.status === "ACTIVE"

    async function handleToggle(checked: boolean) {
        setIsToggling(true)
        try {
            await onToggle(bot.id, checked)
        } finally {
            setIsToggling(false)
        }
    }

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            {/* Header row */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-card-foreground">{bot.name}</span>
                    <Badge
                        variant="outline"
                        className={
                            bot.tradeType?.toLowerCase() === "spot"
                                ? "border-orange-300 bg-orange-50 text-orange-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                                : "border-blue-300 bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                        }
                    >
                        {bot.tradeType || "SPOT"}
                    </Badge>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <Switch
                            checked={isActive}
                            onCheckedChange={handleToggle}
                            disabled={isToggling}
                            className="data-[state=checked]:bg-primary"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                aria-label="Bot settings"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Bot
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onViewWebhook}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Webhook
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onManualTrigger}>
                                <Play className="mr-2 h-4 w-4" />
                                Manual Trigger
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Bot
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Info row */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-card-foreground">{bot.pairs?.[0] || "---"}</span>
                <span className="text-border">|</span>
                <span className="font-medium text-card-foreground">
                    {livePrice > 0 ? (
                        `$${livePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                        "Loading..."
                    )}
                </span>
                <span>{"·"}</span>
                <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {bot.amountUnit === "base"
                        ? `${Number(bot.tradeAmount).toFixed(8)} ${bot.pairs?.[0]?.replace("USDT", "") || ""}`
                        : `${Number(bot.tradeAmount).toFixed(2)} USDT`}
                </span>
                <span>{"·"}</span>
                <span>{bot.leverage}x</span>
            </div>

            {/* Exchange sub-card */}
            <div className="mt-4 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">
                            {bot.exchange?.label || bot.exchange?.name || "Unknown"}
                        </span>
                    </div>
                    <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                    >
                        CONNECTED
                    </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active Balance</p>
                        <p className="text-sm font-semibold text-card-foreground">
                            ${(bot.exchange?.availableBalance || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Value</p>
                        <p className="text-sm font-semibold text-emerald-500">
                            ${(bot.exchange?.totalValue || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom action cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-card-foreground">Signals</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Logs</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50 cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-card-foreground">Positions</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                            {bot.positions?.length || 0} ACTIVE
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
