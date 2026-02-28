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
        botId: bot.id
    }, null, 2)

    return (
        <div className="grid gap-6">
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Webhook Target URL
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Paste this URL into the <span className="font-semibold text-foreground">Webhook URL</span> field in your TradingView alert notifications.
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={webhookUrl}
                            readOnly
                            className="font-mono text-[11px] bg-muted/40 border-dashed"
                        />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0"
                            onClick={() => copyToClipboard(webhookUrl)}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Alert Message Payload (JSON)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Copy this JSON into the <span className="font-semibold text-foreground">Message</span> box on TradingView.
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(payload)}
                            className="h-8 text-xs gap-2"
                        >
                            <Copy className="h-3 w-3" /> Copy JSON
                        </Button>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                        <pre className="p-4 font-mono text-[11px] overflow-x-auto max-h-[200px] leading-relaxed">
                            {payload}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
