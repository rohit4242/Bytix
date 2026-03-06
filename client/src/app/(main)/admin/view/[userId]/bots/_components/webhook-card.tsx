"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface WebhookCardProps {
    bot: any
}

export function WebhookCard({ bot }: WebhookCardProps) {
    const [copied, setCopied] = useState(false)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bytix.app"
    const webhookUrl = `${appUrl}/api/webhook/${bot.webhookSecret}`

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success("Copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    const payload = JSON.stringify({
        action: "{{strategy.order.action}}",
        symbol: "{{ticker}}",
        price: "{{strategy.order.price}}",
        secret: bot.webhookSecret
    }, null, 2)

    const exchange = bot.exchange?.name || "BINANCE"
    const symbol = bot.pairs?.[0] || "BTCUSDT"
    const secret = bot.webhookSecret || "SECRET"

    const generateStringSignal = (action: string) => {
        return `${action}_${exchange}_${symbol}_${secret}`
    }

    const actions = [
        { label: "Enter Long", value: "ENTER_LONG" },
        { label: "Exit Long", value: "EXIT_LONG" },
        { label: "Enter Short", value: "ENTER_SHORT" },
        { label: "Exit Short", value: "EXIT_SHORT" },
        { label: "Dynamic", value: "{{strategy.order.action}}" },
    ]

    return (
        <div className="grid gap-6 pb-4">
            <Card className="border-border/60 bg-muted/20">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Webhook Target URL
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Paste this URL into the <span className="font-semibold text-foreground">Webhook URL</span> field in your TradingView alert notifications.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={webhookUrl}
                            readOnly
                            className="font-mono text-[10px] h-9 bg-background/50 border-input/50"
                        />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            onClick={() => copyToClipboard(webhookUrl)}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            JSON Payload (Standard)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Use for advanced multi-bot strategies.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(payload)}
                                className="h-7 text-[10px] gap-1.5 px-2"
                            >
                                <Copy className="h-3 w-3" /> Copy JSON
                            </Button>
                        </div>
                        <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                            <pre className="p-3 font-mono text-[10px] overflow-x-auto max-h-[160px] leading-relaxed text-blue-400/90 dark:text-blue-300/90">
                                {payload}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            String Signal (Simplified)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Compact format: <code className="bg-muted px-1 rounded text-[9px]">ACTION_EXCHANGE_SYMBOL_SECRET</code>
                        </p>

                        <div className="space-y-2">
                            {actions.map((act) => {
                                const sig = generateStringSignal(act.value)
                                return (
                                    <div key={act.value} className="group relative flex items-center justify-between p-2 rounded-md bg-muted/40 border border-transparent hover:border-emerald-500/30 transition-all">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-bold uppercase text-muted-foreground/70">{act.label}</span>
                                            <code className="text-[10px] font-mono truncate max-w-[140px] text-foreground/80">
                                                {sig}
                                            </code>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard(sig)}
                                            className="h-7 w-7 p-0 opacity-40 group-hover:opacity-100 transition-opacity"
                                        >
                                            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
