"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SignalBadge } from "@/components/trading/signal-badge"
import { Activity, LogIn, LogOut, ArrowRight } from "lucide-react"
import { formatDateTime, cn } from "@/lib/utils"

interface RecentActivityProps {
    signals: any[]
}

export function RecentActivity({ signals }: RecentActivityProps) {
    if (signals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center bg-muted/5">
                <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No recent activity</h3>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">
                    Signals and trade updates will appear here.
                </p>
            </div>
        )
    }

    return (
        <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Recent Signal Pulse
                </CardTitle>
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                    {signals.map((signal) => {
                        const isEntry = signal.action.includes("BUY") || signal.action.includes("LONG") || signal.action.includes("ENTRY")

                        return (
                            <div key={signal.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors group">
                                <div className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                    isEntry
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                        : "border-red-500/20 bg-red-500/10 text-red-500"
                                )}>
                                    {isEntry ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-tight truncate">
                                            {signal.bot?.name || "System"}
                                        </span>
                                        <ArrowRight className="h-2 w-2 text-muted-foreground" />
                                        <span className="text-[10px] font-mono font-black text-muted-foreground">
                                            {signal.symbol}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                        {formatDateTime(signal.createdAt)}
                                    </span>
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                    <SignalBadge status={signal.status} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
