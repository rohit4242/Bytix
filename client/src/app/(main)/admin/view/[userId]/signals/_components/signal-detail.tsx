"use client"

import { useState } from "react"
import {
    Copy,
    Check,
    Activity,
    Bot,
    Clock,
    Terminal,
    AlertTriangle,
    Cpu,
    Link as LinkIcon
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    cn,
    copyToClipboard,
    formatDateTime as formatDate,
} from "@/lib/utils"

interface SignalDetailProps {
    signal: any
}

function DetailLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {children}
        </p>
    )
}

export function SignalDetail({ signal }: SignalDetailProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = async (text: string, id: string) => {
        const success = await copyToClipboard(text)
        if (success) {
            setCopiedId(id)
            toast.success("Copied to clipboard")
            setTimeout(() => setCopiedId(null), 2000)
        }
    }

    const action = signal.action.toUpperCase()
    const isEntry = action.includes("BUY") || action.includes("LONG") || action.includes("ENTRY")

    return (
        <div className="rounded-xl border border-border bg-card">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-0">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            isEntry ? "bg-emerald-500/10" : "bg-red-500/10"
                        )}
                    >
                        <Activity className={cn("h-5 w-5", isEntry ? "text-emerald-600" : "text-red-500")} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-card-foreground">
                                {signal.symbol}
                            </span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0",
                                    isEntry
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                                        : "border-red-500/30 bg-red-500/10 text-red-600"
                                )}
                            >
                                {signal.action}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {signal.bot?.name && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5">
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Bot Managed
                            </span>
                            <span className="text-xs font-semibold text-card-foreground">
                                {signal.bot.name}
                            </span>
                        </div>
                    )}
                    <div className="text-right">
                        <DetailLabel>Signal ID</DetailLabel>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(signal.id, "sig-id")}
                        >
                            {signal.id}
                            {copiedId === "sig-id" ? (
                                <Check className="ml-1 h-3 w-3 text-emerald-500" />
                            ) : (
                                <Copy className="ml-1 h-3 w-3" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Key Metrics ── */}
            <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
                <div>
                    <DetailLabel>Status</DetailLabel>
                    <div className="mt-1">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                                signal.status === "PROCESSED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" :
                                    signal.status === "FAILED" ? "border-red-500/30 bg-red-500/10 text-red-600" :
                                        "border-amber-500/30 bg-amber-500/10 text-amber-600"
                            )}
                        >
                            {signal.status}
                        </Badge>
                    </div>
                </div>
                <div>
                    <DetailLabel>Action Type</DetailLabel>
                    <p className="mt-0.5 text-lg font-bold text-card-foreground uppercase tracking-tight">
                        {isEntry ? "Position Entry" : "Position Exit"}
                    </p>
                </div>
                <div>
                    <DetailLabel>Asset Symbol</DetailLabel>
                    <p className="mt-0.5 text-lg font-bold text-card-foreground">
                        {signal.symbol}
                    </p>
                </div>
                <div>
                    <DetailLabel>Timestamp</DetailLabel>
                    <div className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-card-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(signal.createdAt)}
                    </div>
                </div>
            </div>

            {/* ── System & Automation + Debug Info ── */}
            <div className="grid grid-cols-1 gap-4 px-5 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-card-foreground">
                            Processing Details
                        </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                            <DetailLabel>Processed</DetailLabel>
                            <p className={cn(
                                "mt-0.5 text-sm font-medium",
                                signal.processed ? "text-emerald-600" : "text-amber-500"
                            )}>
                                {signal.processed ? "Completed" : "Pending"}
                            </p>
                        </div>
                        <div>
                            <DetailLabel>Processed At</DetailLabel>
                            <p className="mt-0.5 text-sm font-medium text-card-foreground">
                                {signal.processedAt ? formatDate(signal.processedAt) : "N/A"}
                            </p>
                        </div>
                    </div>
                    {signal.positionId && (
                        <div className="mt-4 border-t border-border pt-3">
                            <DetailLabel>Linked Position</DetailLabel>
                            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-primary">
                                <LinkIcon className="h-3 w-3" />
                                {signal.positionId}
                            </div>
                        </div>
                    )}
                </div>

                <div className={cn(
                    "rounded-lg border p-4",
                    signal.errorMessage ? "border-red-500/30 bg-red-500/5" : "border-border"
                )}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("h-4 w-4", signal.errorMessage ? "text-red-500" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-card-foreground">
                            System Logs & Status
                        </span>
                    </div>
                    <div className="mt-3">
                        <DetailLabel>Error Messages</DetailLabel>
                        <p className={cn(
                            "mt-1 text-xs font-medium leading-relaxed",
                            signal.errorMessage ? "text-red-500" : "text-muted-foreground/60 italic"
                        )}>
                            {signal.errorMessage || "No errors reported for this signal pulse."}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Raw Payload ── */}
            <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-card-foreground">
                        Raw Webhook Payload
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-white dark:bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground shadow-inner">
                    <pre className="whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto custom-scrollbar uppercase tracking-tight opacity-80">
                        {JSON.stringify(signal.rawPayload, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}
