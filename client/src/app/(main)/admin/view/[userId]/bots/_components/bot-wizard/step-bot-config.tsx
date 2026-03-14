"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useFormContext } from "react-hook-form"
import { type BotWizardValues } from "./schema"
import { ArrowRight, Bot, Wifi, WifiOff } from "lucide-react"
import { SanitizedExchange } from "@/app/actions/exchanges"
import { TradeType, OrderType } from "@/generated/prisma"

const TRADING_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "DOTUSDT", "DOGEUSDT", "BTCFDUSD", "ETHFDUSD"]

interface StepBotConfigProps {
    exchanges: SanitizedExchange[]
    onNext: () => void
}

export function StepBotConfig({ exchanges, onNext }: StepBotConfigProps) {
    const { control, watch } = useFormContext<BotWizardValues>()

    const values = watch()
    const canProceed =
        values.name.trim().length > 0 &&
        values.exchangeId.length > 0 &&
        values.symbol.length > 0

    return (
        <div className="flex flex-col gap-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Bot Identity</h3>
                    <p className="text-xs text-muted-foreground">Name and describe your bot</p>
                </div>
            </div>

            {/* Bot Name & Description */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Bot Name
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g. Groot"
                                    className="bg-secondary/50 border-border"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Description <span className="text-muted-foreground/60 normal-case">(optional)</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Trend following strategy..."
                                    className="bg-secondary/50 border-border"
                                    {...field}
                                    value={field.value || ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Market Section */}
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <svg className="h-4.5 w-4.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Target Market</h3>
                    <p className="text-xs text-muted-foreground">Select exchange and trading pair</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="exchangeId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Exchange
                            </FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full bg-secondary/50 border-border">
                                        <SelectValue placeholder="Select exchange" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {exchanges.map((ex) => (
                                        <SelectItem key={ex.id} value={ex.id} disabled={!ex.isActive}>
                                            <div className="flex items-center gap-2">
                                                {ex.isActive ? (
                                                    <Wifi className="h-3 w-3 text-primary" />
                                                ) : (
                                                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                                                )}
                                                <span>{ex.label || ex.name}</span>
                                                {!ex.isActive && (
                                                    <span className="text-xs text-muted-foreground">(not connected)</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="symbol"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Trading Pair
                            </FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full bg-secondary/50 border-border">
                                        <SelectValue placeholder="Select pair" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {TRADING_PAIRS.map((pair) => (
                                        <SelectItem key={pair} value={pair}>
                                            {pair}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={control}
                    name="orderType"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Order Type
                            </FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger className="w-full bg-secondary/50 border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={OrderType.MARKET}>Market Order</SelectItem>
                                    <SelectItem value={OrderType.LIMIT}>Limit Order</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="tradeType"
                    render={({ field }) => (
                        <FormItem className="flex flex-col gap-1.5 space-y-0">
                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                Account Type
                            </FormLabel>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => field.onChange(TradeType.SPOT)}
                                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${field.value === TradeType.SPOT
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Spot
                                </button>
                                <button
                                    type="button"
                                    onClick={() => field.onChange(TradeType.MARGIN)}
                                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${field.value === TradeType.MARGIN
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    Margin
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Summary Preview */}
            {canProceed && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-mono">
                            {values.symbol || "---"}
                        </Badge>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                            {values.tradeType === TradeType.SPOT ? "Spot" : "Margin"}
                        </Badge>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                            {values.orderType === OrderType.MARKET ? "Market" : "Limit"}
                        </Badge>
                        <span className="text-muted-foreground">on</span>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                            {exchanges.find((e) => e.id === values.exchangeId)?.label || exchanges.find((e) => e.id === values.exchangeId)?.name || "---"}
                        </Badge>
                    </div>
                </div>
            )}

            {/* Next Button */}
            <div className="flex justify-end pt-2">
                <Button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="gap-2"
                >
                    Next: Trade Setup
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
