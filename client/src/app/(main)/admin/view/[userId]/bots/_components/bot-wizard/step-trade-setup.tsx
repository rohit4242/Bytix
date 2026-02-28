"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { useFormContext } from "react-hook-form"
import { type BotWizardValues } from "@/app/(main)/admin/view/[userId]/bots/_components/bot-wizard/schema"
import {
    validateTrade,
    calculateTradeEstimate,
} from "@/lib/bot-utils"
import { useLivePrice } from "@/hooks/use-live-price"
import { TradeType, SideEffectType } from "@/generated/prisma"
import {
    ArrowLeft,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Info,
    Loader2,
    Wallet,
    Shield,
    CircleDollarSign,
    ChevronDown,
    ArrowRightLeft,
    Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StepTradeSetupProps {
    backendData: any | null
    loading: boolean
    onBack: () => void
    onNext: () => void
}

export function StepTradeSetup({
    backendData,
    loading,
    onBack,
    onNext,
}: StepTradeSetupProps) {
    const { control, watch, setValue } = useFormContext<BotWizardValues>()
    const values = watch()
    const { price } = useLivePrice(values.symbol)

    // Pass values directly to validation/estimation
    const validation = useMemo(() => {
        if (!backendData) return null
        const dataWithPrice = { ...backendData, price }
        return validateTrade(dataWithPrice, values, values.tradeType)
    }, [backendData, values, price])

    const estimate = useMemo(() => {
        if (!backendData) return null
        const dataWithPrice = { ...backendData, price }
        return calculateTradeEstimate(dataWithPrice, values)
    }, [backendData, values, price])

    const isSpot = values.tradeType === TradeType.SPOT

    if (loading && !backendData) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                        Fetching market data...
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Loading balances and symbol constraints
                    </p>
                </div>
            </div>
        )
    }

    if (!backendData && !loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-12 px-4">
                <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                </div>

                <div className="text-center space-y-2 max-w-[280px]">
                    <h3 className="text-base font-bold text-foreground">Market Data Unavailable</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        We couldn't fetch the required trading constraints or balances for <span className="font-mono font-bold text-foreground">{values.symbol}</span> on this exchange.
                    </p>
                </div>

                <div className="flex flex-col w-full gap-2">
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="w-full gap-2 border-border hover:bg-secondary/50"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Retry Connection
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Go Back to Config
                    </Button>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/50 w-full">
                    <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground leading-normal">
                            This can happen if the API keys are invalid, the exchange is down, or the trading pair is not supported for your account type.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!backendData || !validation || !estimate) return null

    const unit =
        values.amountUnit === "quote"
            ? backendData.quoteAsset
            : backendData.baseAsset

    return (
        <div className="flex flex-col gap-5">
            {/* ── Trade Amount Input ── */}
            <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            Trade Amount
                        </Label>
                    </div>
                    {values.tradeAmount > 0 && (
                        <span className="text-xs font-mono text-primary">
                            {values.leverage > 1 && `${values.leverage}x = `}
                            {values.amountUnit === "quote"
                                ? `${estimate.executableQty} ${backendData.baseAsset}`
                                : `${estimate.estimatedNotional} ${backendData.quoteAsset}`}
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <FormField
                        control={control}
                        name="tradeAmount"
                        render={({ field }) => (
                            <div className="flex-1 relative">
                                <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    className={cn(
                                        "w-full bg-secondary/50 border-border font-mono text-base",
                                        !validation.isValid &&
                                        validation.fieldHints.some(
                                            (h) => h.key === "amount" && h.status === "error"
                                        ) &&
                                        "border-destructive/60 focus-visible:ring-destructive/40"
                                    )}
                                />
                                {loading && (
                                    <div className="absolute -bottom-5 left-1 flex items-center gap-1.5 px-1 py-0.5 rounded-sm bg-background/80 backdrop-blur-sm z-10 transition-opacity">
                                        <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                                        <span className="text-[9px] text-primary font-semibold tracking-tight uppercase">Updating constraints...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                    <div className="flex rounded-md border border-border overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setValue("amountUnit", "quote")}
                            className={cn(
                                "px-3 py-2 text-xs font-semibold transition-colors",
                                values.amountUnit === "quote"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {backendData.quoteAsset}
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue("amountUnit", "base")}
                            className={cn(
                                "px-3 py-2 text-xs font-semibold transition-colors",
                                values.amountUnit === "base"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {backendData.baseAsset}
                        </button>
                    </div>
                </div>

                {/* Inline constraint hints */}
                {validation.fieldHints.length > 0 && values.tradeAmount > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                        {validation.fieldHints
                            .filter((h: any) => h.key !== "amount")
                            .map((hint: any) => (
                                <HintPill key={hint.key} hint={hint} />
                            ))}
                    </div>
                )}

                {/* Buying power bar */}
                <BuyingPowerBar
                    total={validation.buyingPower}
                    used={validation.buyingPowerUsed}
                    percent={validation.buyingPowerPercent}
                    unit={unit}
                    overLimit={validation.buyingPowerUsed > validation.buyingPower}
                />
            </section>

            {/* ── Leverage & Side Effect (margin only) ── */}
            {!isSpot ? (
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={control}
                        name="leverage"
                        render={({ field }) => (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Leverage
                                    </FormLabel>
                                    <Badge
                                        variant="secondary"
                                        className="bg-warning/10 text-warning border-warning/20 font-mono text-xs"
                                    >
                                        {field.value}x
                                    </Badge>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value]}
                                        onValueChange={([v]) => field.onChange(v)}
                                        min={1}
                                        max={4}
                                        step={1}
                                        className="py-2"
                                    />
                                </FormControl>
                                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                    <span>1x</span>
                                    <span>4x</span>
                                </div>
                            </div>
                        )}
                    />

                    <FormField
                        control={control}
                        name="sideEffect"
                        render={({ field }) => (
                            <FormItem className="flex flex-col gap-1.5 space-y-0">
                                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                    Side Effect
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
                                        <SelectItem value={SideEffectType.NO_SIDE_EFFECT}>No Side Effect</SelectItem>
                                        <SelectItem value={SideEffectType.MARGIN_BUY}>Margin Buy</SelectItem>
                                        <SelectItem value={SideEffectType.AUTO_REPAY}>Auto Repay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                </section>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-2.5">
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                        Spot mode active. Leverage and side effect are disabled.
                    </p>
                </div>
            )}

            {/* ── Divider ── */}
            <div className="h-px bg-border" />

            {/* ── Balances ── */}
            <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {isSpot ? "Spot Balances" : "Margin Balances"}
                    </span>
                </div>

                {isSpot ? (
                    <SpotBalances data={backendData} />
                ) : (
                    <MarginBalances data={backendData} />
                )}
            </section>

            {/* ── Trade Estimate (horizontal flow bar) ── */}
            <TradeEstimateBar
                estimate={estimate}
                baseAsset={backendData.baseAsset}
                quoteAsset={backendData.quoteAsset}
                amountUnit={values.amountUnit}
                inputAmount={values.tradeAmount}
                leverage={values.leverage}
            />

            {/* ── Validation Status ── */}
            {validation && <ValidationPanel validation={validation} />}

            {/* ── Symbol Filters (collapsible) ── */}
            <SymbolFiltersCollapsible
                constraints={backendData.constraints}
                quoteAsset={backendData.quoteAsset}
            />

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between pt-1">
                <Button variant="outline" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <Button
                    onClick={onNext}
                    disabled={!validation?.isValid}
                    className="gap-2"
                >
                    Next: Review
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

/* ── Hint Pill ── */
function HintPill({ hint }: { hint: any }) {
    const color =
        hint.status === "error"
            ? "text-destructive"
            : hint.status === "warn"
                ? "text-warning"
                : "text-muted-foreground"

    const icon =
        hint.status === "error" ? (
            <AlertTriangle className="h-2.5 w-2.5" />
        ) : hint.status === "warn" ? (
            <Info className="h-2.5 w-2.5" />
        ) : (
            <CheckCircle2 className="h-2.5 w-2.5" />
        )

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium cursor-default",
                            color
                        )}
                    >
                        {icon}
                        {hint.message}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {hint.label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

/* ── Buying Power Bar ── */
function BuyingPowerBar({
    total,
    used,
    percent,
    unit,
    overLimit,
}: {
    total: number
    used: number
    percent: number
    unit: string
    overLimit: boolean
}) {
    const barColor = overLimit
        ? "bg-destructive"
        : percent > 80
            ? "bg-warning"
            : "bg-primary"

    const textColor = overLimit
        ? "text-destructive"
        : percent > 80
            ? "text-warning"
            : "text-muted-foreground"

    const decimals = unit === "USDT" || unit === "USD" ? 2 : 8

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Buying Power
                </span>
                <span className={cn("text-[10px] font-mono font-medium", textColor)}>
                    {used.toFixed(decimals)} / {total.toFixed(decimals)} {unit}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    )
}

/* ── Spot Balances ── */
function SpotBalances({ data }: { data: any }) {
    const quoteFree = parseFloat(data.balances.spot.quote.free)
    const baseFree = parseFloat(data.balances.spot.base.free)

    return (
        <div className="rounded-lg border border-border bg-secondary/10 p-3">
            <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-3 py-2.5">
                    <span className="text-[9px] text-muted-foreground uppercase">
                        Available {data.quoteAsset}
                    </span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {quoteFree.toFixed(2)}
                    </span>
                </div>
                <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-3 py-2.5">
                    <span className="text-[9px] text-muted-foreground uppercase">
                        Available {data.baseAsset}
                    </span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {baseFree.toFixed(6)}
                    </span>
                </div>
            </div>
        </div>
    )
}

/* ── Margin Balances ── */
function MarginBalances({
    data,
}: {
    data: any
}) {
    const mq = data.balances.margin.quote
    const mb = data.balances.margin.base

    const quoteFree = parseFloat(mq.free)
    const quoteBorrowed = parseFloat(mq.borrowed)
    const quoteMaxBorrow = parseFloat(mq.maxBorrow)

    const baseFree = parseFloat(mb.free)
    const baseBorrowed = parseFloat(mb.borrowed)
    const baseMaxBorrow = parseFloat(mb.maxBorrow)

    return (
        <div className="rounded-lg border border-border bg-secondary/10 p-3 flex flex-col gap-3">
            {/* Quote asset */}
            <div>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {data.quoteAsset}
                </span>
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground uppercase">Free</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {quoteFree.toFixed(2)}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">+</span>
                    <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground uppercase">Borrowable</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {quoteMaxBorrow.toFixed(2)}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">=</span>
                    <div className="flex-1 flex flex-col items-center rounded-md bg-primary/5 border border-primary/15 px-2.5 py-2">
                        <span className="text-[9px] text-primary/70 uppercase">Total</span>
                        <span className="text-xs font-mono font-bold text-primary">
                            {(quoteFree + quoteMaxBorrow).toFixed(2)}
                        </span>
                    </div>
                </div>
                {quoteBorrowed > 0 && (
                    <span className="text-[9px] text-muted-foreground mt-1 block">
                        Already borrowed: <span className="font-mono text-foreground/70">{quoteBorrowed.toFixed(2)}</span>
                    </span>
                )}
            </div>

            <div className="h-px bg-border" />

            {/* Base asset */}
            <div>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {data.baseAsset}
                </span>
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground uppercase">Free</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {baseFree.toFixed(6)}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">+</span>
                    <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground uppercase">Borrowable</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {baseMaxBorrow.toFixed(6)}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50">=</span>
                    <div className="flex-1 flex flex-col items-center rounded-md bg-primary/5 border border-primary/15 px-2.5 py-2">
                        <span className="text-[9px] text-primary/70 uppercase">Total</span>
                        <span className="text-xs font-mono font-bold text-primary">
                            {(baseFree + baseMaxBorrow).toFixed(6)}
                        </span>
                    </div>
                </div>
                {baseBorrowed > 0 && (
                    <span className="text-[9px] text-muted-foreground mt-1 block">
                        Already borrowed: <span className="font-mono text-foreground/70">{baseBorrowed.toFixed(8)}</span>
                    </span>
                )}
            </div>
        </div>
    )
}

/* ── Trade Estimate Bar ── */
function TradeEstimateBar({
    estimate,
    baseAsset,
    quoteAsset,
    amountUnit,
    inputAmount,
    leverage,
}: {
    estimate: { executableQty: string; estimatedNotional: string }
    baseAsset: string
    quoteAsset: string
    amountUnit: "quote" | "base"
    inputAmount: number
    leverage: number
}) {
    const effectiveAmount = inputAmount * leverage
    if (effectiveAmount <= 0) return null

    return (
        <div className="rounded-lg border border-border bg-secondary/10 p-3">
            <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Trade Estimate
                </span>
                {leverage > 1 && (
                    <span className="text-[10px] font-mono text-warning">
                        ({leverage}x leverage applied)
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* You spend / sell */}
                <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-3 py-2.5">
                    <span className="text-[9px] text-muted-foreground uppercase">
                        You {amountUnit === "quote" ? "spend" : "sell"}
                    </span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {amountUnit === "quote"
                            ? `${effectiveAmount.toFixed(2)} ${quoteAsset}`
                            : `${effectiveAmount.toFixed(8)} ${baseAsset}`}
                    </span>
                </div>

                <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />

                {/* You get */}
                <div className="flex-1 flex flex-col items-center rounded-md bg-primary/5 border border-primary/15 px-3 py-2.5">
                    <span className="text-[9px] text-primary/70 uppercase">
                        You get
                    </span>
                    <span className="text-sm font-mono font-bold text-primary">
                        {amountUnit === "quote"
                            ? `${estimate.executableQty} ${baseAsset}`
                            : `${estimate.estimatedNotional} ${quoteAsset}`}
                    </span>
                </div>
            </div>
        </div>
    )
}

/* ── Validation Status ── */
function ValidationPanel({
    validation,
}: {
    validation: { isValid: boolean; errors: string[]; warnings: string[] }
}) {
    if (validation.isValid && validation.warnings.length === 0) {
        return (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs font-medium text-primary">
                    All checks passed - trade is valid.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {validation.errors.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    <div className="flex-1 flex flex-col gap-0.5">
                        {validation.errors.map((err, i) => (
                            <p key={i} className="text-xs text-destructive/90">
                                {err}
                            </p>
                        ))}
                    </div>
                </div>
            )}
            {validation.warnings.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/5 px-4 py-3">
                    <Info className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                    <div className="flex-1 flex flex-col gap-0.5">
                        {validation.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-warning/90">
                                {w}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Symbol Filters (Collapsible) ── */
function SymbolFiltersCollapsible({
    constraints,
    quoteAsset,
}: {
    constraints: any
    quoteAsset: string
}) {
    return (
        <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Symbol Filters
                </span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <FilterChip label="Min Qty" value={constraints.minQty} />
                    <FilterChip label="Step Size" value={constraints.stepSize} />
                    <FilterChip
                        label="Min Notional"
                        value={`${constraints.minNotional} ${quoteAsset}`}
                    />
                    <FilterChip label="Tick Size" value={constraints.tickSize} />
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

function FilterChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-secondary/30 px-2.5 py-1.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {label}
            </p>
            <p className="text-[11px] font-mono font-medium text-foreground mt-0.5">
                {value}
            </p>
        </div>
    )
}
