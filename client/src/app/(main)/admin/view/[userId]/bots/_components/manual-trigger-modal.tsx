"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, CheckCircle2, XCircle, SkipForward } from "lucide-react"
import { SanitizedBot } from "@/app/actions/bots"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type TriggerResult = {
    success: boolean
    action?: string
    positionId?: string
    skipped?: boolean
    reason?: string
    error?: string
    signalId?: string
}

interface ManualTriggerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bot: SanitizedBot | null
    onConfirm: (botId: string, action: string) => Promise<TriggerResult>
}

export function ManualTriggerModal({ open, onOpenChange, bot, onConfirm }: ManualTriggerModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [action, setAction] = useState<string>("")
    const [result, setResult] = useState<TriggerResult | null>(null)

    if (!bot) return null

    const handleConfirm = async () => {
        if (!action) return
        setIsLoading(true)
        setResult(null)
        try {
            const res = await onConfirm(bot.id, action)
            setResult(res)
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(() => {
            setAction("")
            setResult(null)
        }, 300)
    }

    const isSpot = bot.tradeType === "SPOT" || bot.tradeType?.toString() === "SPOT"
    const actionOptions = isSpot ? ["ENTER_LONG", "EXIT_LONG"] : ["ENTER_LONG", "ENTER_SHORT", "EXIT_LONG", "EXIT_SHORT"]
    const effectiveAmount = bot.tradeAmount * (bot.leverage || 1)

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Manual Trigger Signal</DialogTitle>
                    <DialogDescription>
                        Manually trigger an execution signal for <strong>{bot.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {/* ─── Result View ─────────────────────────────────────── */}
                {result ? (
                    <div className="flex flex-col gap-4 py-2">
                        <ResultCard result={result} action={action} />
                        <Button variant="outline" onClick={handleClose}>Close</Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-5 py-4">
                            {/* Signal Action Selection */}
                            <div className="space-y-2">
                                <Label>Signal Action</Label>
                                <Select value={action} onValueChange={setAction} disabled={isLoading}>
                                    <SelectTrigger className="w-full bg-secondary/30">
                                        <SelectValue placeholder="Select signal action..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actionOptions.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt.replace("_", " ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Trade Summary */}
                            <div className="rounded-lg border border-border bg-secondary/10 p-4 flex flex-col gap-4">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Bot Configuration
                                </span>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    <SummaryRow label="Pair" value={bot.pairs[0] || "Unknown"} mono />
                                    <SummaryRow label="Account" value={isSpot ? "Spot" : "Margin"} />
                                    <SummaryRow label="Order Type" value={bot.orderType === "MARKET" ? "Market" : "Limit"} />
                                    {!isSpot && (
                                        <SummaryRow label="Leverage" value={`${bot.leverage || 1}x`} highlight />
                                    )}
                                    <SummaryRow
                                        label="Trade Amount"
                                        value={
                                            bot.amountUnit === "quote"
                                                ? `${Number(bot.tradeAmount).toFixed(2)} USDT`
                                                : `${Number(bot.tradeAmount).toFixed(8)} BASE`
                                        }
                                        mono
                                    />
                                    {!isSpot && (bot.leverage || 1) > 1 && (
                                        <SummaryRow
                                            label="Effective Amount"
                                            value={
                                                bot.amountUnit === "quote"
                                                    ? `${effectiveAmount.toFixed(2)} USDT`
                                                    : `${effectiveAmount.toFixed(8)} BASE`
                                            }
                                            mono
                                            highlight
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 flex items-start gap-3">
                                <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                                <p className="text-xs text-warning/90">
                                    Triggering manually bypasses normal webhook processing. Ensure the selected action aligns with your current exchange positions to avoid order rejection.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleConfirm} disabled={isLoading || !action}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Sending..." : "Execute Signal"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ─── Result display ───────────────────────────────────────────────────────

function ResultCard({ result, action }: { result: TriggerResult; action: string }) {
    if (!result.success && !result.skipped) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <span className="font-semibold text-sm">Signal Failed</span>
                </div>
                <p className="text-xs text-muted-foreground">{result.error || "An unknown error occurred."}</p>
                {result.signalId && (
                    <p className="text-[10px] text-muted-foreground font-mono">Signal ID: {result.signalId}</p>
                )}
            </div>
        )
    }

    if (result.skipped || result.action === "SKIPPED") {
        return (
            <div className="rounded-lg border border-yellow-300/30 bg-yellow-50/10 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-yellow-600">
                    <SkipForward className="h-5 w-5 shrink-0" />
                    <span className="font-semibold text-sm">Signal Skipped</span>
                </div>
                <p className="text-xs text-muted-foreground">{result.reason || "Signal was skipped by the pipeline."}</p>
                {result.signalId && (
                    <p className="text-[10px] text-muted-foreground font-mono">Signal ID: {result.signalId}</p>
                )}
            </div>
        )
    }

    const isOpen = result.action === "OPENED"
    return (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-50/10 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-semibold text-sm">
                    Position {isOpen ? "Opened" : "Closed"}
                </span>
            </div>
            <p className="text-xs text-muted-foreground">
                {isOpen
                    ? `${action.replace("_", " ")} signal executed successfully. A new position has been opened.`
                    : `${action.replace("_", " ")} signal executed. Position closed and P&L recorded.`
                }
            </p>
            {result.positionId && (
                <p className="text-[10px] text-muted-foreground font-mono">Position ID: {result.positionId}</p>
            )}
            {result.signalId && (
                <p className="text-[10px] text-muted-foreground font-mono">Signal ID: {result.signalId}</p>
            )}
        </div>
    )
}

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
            <span className={cn("text-xs font-medium", mono && "font-mono", highlight ? "text-warning" : "text-foreground")}>
                {value}
            </span>
        </div>
    )
}
