import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
    calculateTradeEstimate,
} from "@/lib/bot-utils"
import { useLivePrice } from "@/hooks/use-live-price"
import {
    ArrowLeft,
    Target,
    ShieldAlert,
    ArrowRightLeft,
    Zap,
    Bot,
    Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

import { SanitizedExchange } from "@/app/actions/exchanges"
import { TradeType, OrderType } from "@/generated/prisma"

interface StepReviewProps {
    backendData: any | null
    exchanges: SanitizedExchange[]
    onBack: () => void
    onConfirm: () => void
    isLoading?: boolean
    initialData?: any
}

export function StepReview({
    backendData,
    exchanges,
    onBack,
    onConfirm,
    isLoading = false,
    initialData,
}: StepReviewProps) {
    const { control, watch, setValue } = useFormContext<BotWizardValues>()
    const values = watch()
    const { price } = useLivePrice(values.symbol)

    // Pass values directly to estimation
    const estimate = useMemo(() => {
        if (!backendData) return null
        const dataWithPrice = { ...backendData, price }
        return calculateTradeEstimate(dataWithPrice, values)
    }, [backendData, values, price])

    const [tpEnabled, setTpEnabled] = useState(!!values.tpPercent)
    const [slEnabled, setSlEnabled] = useState(!!values.slPercent)

    // Sync quantity to form whenever estimate changes
    useEffect(() => {
        if (estimate?.executableQty) {
            const qty = parseFloat(estimate.executableQty)
            if (qty !== values.quantity) {
                setValue("quantity", qty)
            }
        }
    }, [estimate?.executableQty, setValue, values.quantity])

    const effectiveAmount = values.tradeAmount * values.leverage
    const isSpot = values.tradeType === TradeType.SPOT
    const exchangeName =
        exchanges.find((e) => e.id === values.exchangeId)?.label ||
        exchanges.find((e) => e.id === values.exchangeId)?.name ||
        values.exchangeId

    return (
        <div className="flex flex-col gap-5">
            {/* ── Trade Summary Card ── */}
            <div className="rounded-lg border border-border bg-secondary/10 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Trade Summary
                    </span>
                </div>

                {/* Info rows */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    <SummaryRow label="Bot Name" value={values.name} />
                    <SummaryRow label="Exchange" value={exchangeName} />
                    <SummaryRow label="Pair" value={values.symbol} mono />
                    <SummaryRow
                        label="Account"
                        value={isSpot ? "Spot" : "Margin"}
                    />
                    <SummaryRow
                        label="Order Type"
                        value={values.orderType === OrderType.MARKET ? "Market" : "Limit"}
                    />
                    <SummaryRow
                        label="Reference Price"
                        value={price ? `$${price.toLocaleString()}` : backendData?.price ? `$${backendData.price.toLocaleString()}` : "---"}
                        mono
                    />
                    {!isSpot && (
                        <SummaryRow
                            label="Leverage"
                            value={`${values.leverage}x`}
                            highlight
                        />
                    )}
                    <SummaryRow
                        label="Trade Amount"
                        value={
                            values.amountUnit === "quote"
                                ? `${values.tradeAmount.toFixed(2)} ${backendData?.quoteAsset ?? ""}`
                                : `${values.tradeAmount.toFixed(8)} ${backendData?.baseAsset ?? ""}`
                        }
                        mono
                    />
                    {!isSpot && values.leverage > 1 && (
                        <SummaryRow
                            label="Effective Amount"
                            value={
                                values.amountUnit === "quote"
                                    ? `${effectiveAmount.toFixed(2)} ${backendData?.quoteAsset ?? ""}`
                                    : `${effectiveAmount.toFixed(8)} ${backendData?.baseAsset ?? ""}`
                            }
                            mono
                            highlight
                        />
                    )}
                </div>

                {/* Mini estimate inside summary */}
                {estimate && backendData && effectiveAmount > 0 && (
                    <>
                        <div className="h-px bg-border" />
                        <div className="flex items-center gap-3">
                            <div className="flex-1 flex flex-col items-center rounded-md bg-secondary/40 px-3 py-2">
                                <span className="text-[9px] text-muted-foreground uppercase">
                                    You {values.amountUnit === "quote" ? "spend" : "sell"}
                                </span>
                                <span className="text-sm font-mono font-bold text-foreground">
                                    {values.amountUnit === "quote"
                                        ? `${effectiveAmount.toFixed(2)} ${backendData.quoteAsset}`
                                        : `${effectiveAmount.toFixed(8)} ${backendData.baseAsset}`}
                                </span>
                            </div>

                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />

                            <div className="flex-1 flex flex-col items-center rounded-md bg-primary/5 border border-primary/15 px-3 py-2">
                                <span className="text-[9px] text-primary/70 uppercase">
                                    You get
                                </span>
                                <span className="text-sm font-mono font-bold text-primary">
                                    {values.amountUnit === "quote"
                                        ? `${estimate.executableQty} ${backendData.baseAsset}`
                                        : `${estimate.estimatedNotional} ${backendData.quoteAsset}`}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Take Profit ── */}
            <section className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <Label
                            htmlFor="tp-switch"
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer"
                        >
                            Take Profit
                        </Label>
                    </div>
                    <Switch
                        id="tp-switch"
                        checked={tpEnabled}
                        onCheckedChange={setTpEnabled}
                    />
                </div>
                {tpEnabled && (
                    <div className="mt-3 flex flex-col gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">
                            Target price ({backendData?.quoteAsset ?? "USDT"})
                        </Label>
                        <FormField
                            control={control}
                            name="tpPercent"
                            render={({ field }) => (
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={
                                            price
                                                ? (price * 1.05).toFixed(2)
                                                : "0.00"
                                        }
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                                        className="bg-secondary/50 border-border font-mono"
                                    />
                                </FormControl>
                            )}
                        />
                        {price && values.tpPercent && values.tpPercent > 0 && (
                            <span className="text-[10px] font-mono text-primary">
                                +
                                {(
                                    ((values.tpPercent - price) /
                                        price) *
                                    100
                                ).toFixed(2)}
                                % from current price
                            </span>
                        )}
                    </div>
                )}
            </section>

            {/* ── Stop Loss ── */}
            <section className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        <Label
                            htmlFor="sl-switch"
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer"
                        >
                            Stop Loss
                        </Label>
                    </div>
                    <Switch
                        id="sl-switch"
                        checked={slEnabled}
                        onCheckedChange={setSlEnabled}
                    />
                </div>
                {slEnabled && (
                    <div className="mt-3 flex flex-col gap-1.5">
                        <Label className="text-[10px] text-muted-foreground">
                            Stop price ({backendData?.quoteAsset ?? "USDT"})
                        </Label>
                        <FormField
                            control={control}
                            name="slPercent"
                            render={({ field }) => (
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={
                                            price
                                                ? (price * 0.95).toFixed(2)
                                                : "0.00"
                                        }
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                                        className="bg-secondary/50 border-border font-mono"
                                    />
                                </FormControl>
                            )}
                        />
                        {price && values.slPercent && values.slPercent > 0 && (
                            <span className="text-[10px] font-mono text-destructive">
                                {(
                                    ((values.slPercent - price) /
                                        price) *
                                    100
                                ).toFixed(2)}
                                % from current price
                            </span>
                        )}
                    </div>
                )}
            </section>

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between pt-1">
                <Button variant="outline" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <Button
                    onClick={onConfirm}
                    className="gap-2"
                    disabled={isLoading}
                    type="submit"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4" />
                    )}
                    {initialData ? "Update Bot" : "Create Bot"}
                </Button>
            </div>
        </div>
    )
}

/* ── Summary Row ── */
function SummaryRow({
    label,
    value,
    mono = false,
    highlight = false,
}: {
    label: string
    value: string
    mono?: boolean
    highlight?: boolean
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {label}
            </span>
            <span
                className={cn(
                    "text-xs font-medium",
                    mono && "font-mono",
                    highlight ? "text-warning" : "text-foreground"
                )}
            >
                {value}
            </span>
        </div>
    )
}
