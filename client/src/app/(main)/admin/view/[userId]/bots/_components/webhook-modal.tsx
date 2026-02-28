"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { WebhookCard } from "./webhook-card"

interface WebhookModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    bot: any
}

export function WebhookModal({
    open,
    onOpenChange,
    bot,
}: WebhookModalProps) {
    if (!bot) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
                <div className="p-6 pb-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <div className="h-5 w-1 bg-primary rounded-full" />
                            Webhook & Alerts
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Technical details for {bot.name} connection.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <WebhookCard bot={bot} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
