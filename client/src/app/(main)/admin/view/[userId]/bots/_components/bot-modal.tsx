"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { BotWizard } from "./bot-wizard/bot-wizard"
import { WebhookCard } from "./webhook-card"
import { SanitizedExchange } from "@/app/actions/exchanges"

interface BotModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: any) => Promise<any>
    isLoading: boolean
    exchanges: SanitizedExchange[]
    initialData?: any
}

export function BotModal({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
    exchanges,
    initialData,
}: BotModalProps) {
    const [createdBot, setCreatedBot] = React.useState<any | null>(null)
    const [showWebhook, setShowWebhook] = React.useState(false)

    React.useEffect(() => {
        if (open) {
            setShowWebhook(false)
            setCreatedBot(initialData ?? null)
        }
    }, [open, initialData])

    const handleWizardComplete = async (data: any) => {
        const result = await onSubmit(data)
        if (result) {
            setCreatedBot(result)
            setShowWebhook(true)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6">
                {showWebhook && createdBot ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Bot Deployed</DialogTitle>
                            <DialogDescription>
                                Your bot is live. Connect it to your signal provider below.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                            <WebhookCard bot={createdBot} />
                        </div>
                    </>
                ) : (
                    <BotWizard
                        onClose={() => onOpenChange(false)}
                        onComplete={handleWizardComplete}
                        exchanges={exchanges}
                        isLoading={isLoading}
                        initialData={initialData}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
