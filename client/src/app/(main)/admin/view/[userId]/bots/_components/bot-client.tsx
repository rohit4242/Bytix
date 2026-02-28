"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createBot, updateBot, toggleBot, deleteBot, triggerManualSignal } from "@/app/actions/bots"
import { BotHeader } from "./bot-header"
import { BotList } from "./bot-list"
import { BotModal } from "./bot-modal"
import { WebhookModal } from "./webhook-modal"
import { ManualTriggerModal } from "./manual-trigger-modal"
import { Bot, Exchange } from "@/generated/prisma"
import { BotWizardValues } from "./bot-wizard/schema"
import { SanitizedBot } from "@/app/actions/bots"
import { SanitizedExchange } from "@/app/actions/exchanges"

interface BotClientProps {
    userId: string
    initialBots: SanitizedBot[]
    exchanges: SanitizedExchange[]
}

export function BotClient({ userId, initialBots, exchanges }: BotClientProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [isWebhookModalOpen, setIsWebhookModalOpen] = React.useState(false)
    const [isManualTriggerModalOpen, setIsManualTriggerModalOpen] = React.useState(false)
    const [editingBot, setEditingBot] = React.useState<SanitizedBot | null>(null)
    const [webhookBot, setWebhookBot] = React.useState<SanitizedBot | null>(null)
    const [manualTriggerBot, setManualTriggerBot] = React.useState<SanitizedBot | null>(null)

    const handleOpenModal = (bot: SanitizedBot | null = null) => {
        setEditingBot(bot)
        setIsModalOpen(true)
    }

    const handleOpenWebhookModal = (bot: SanitizedBot | null = null) => {
        setWebhookBot(bot)
        setIsWebhookModalOpen(true)
    }

    const handleOpenManualTriggerModal = (bot: SanitizedBot | null = null) => {
        setManualTriggerBot(bot)
        setIsManualTriggerModalOpen(true)
    }

    const handleConfirmManualTrigger = async (botId: string, action: string) => {
        try {
            const result = await triggerManualSignal(botId, action)
            if (result.success) {
                if (result.action === "SKIPPED" || result.skipped) {
                    toast.info(`Signal skipped: ${result.reason}`)
                } else {
                    toast.success(`Signal executed: ${result.action}`)
                }
            } else {
                toast.error(result.error || "Signal failed")
            }
            return result
        } catch (error: any) {
            toast.error(error.message || "Failed to trigger signal")
            return { success: false, error: error.message || "Failed to trigger signal" }
        }
    }

    const handleToggle = async (botId: string, isActive: boolean) => {
        try {
            await toggleBot(botId, isActive)
            toast.success(isActive ? "Bot activated" : "Bot paused")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to toggle bot status")
        }
    }

    const handleDelete = async (botId: string) => {
        if (!confirm("Are you sure you want to delete this bot strategy?")) return

        try {
            await deleteBot(botId)
            toast.success("Bot strategy deleted")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete bot")
        }
    }

    const handleSubmit = async (values: BotWizardValues): Promise<SanitizedBot | null> => {
        setIsLoading(true)
        try {
            let result: SanitizedBot | null
            if (editingBot) {
                console.log("editing bot", values)
                result = await updateBot(editingBot.id, values)
                toast.success("Bot configuration updated")
            } else {
                console.log("creating bot", values)
                result = await createBot(userId, values)
                toast.success("New bot strategy deployed")
            }

            if (result) {
                setEditingBot(result)
            }
            router.refresh()
            return result
        } catch (error: any) {
            toast.error(error.message || "Failed to save bot strategy")
            return null
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <BotHeader onAdd={() => handleOpenModal()} />

            <BotList
                bots={initialBots as any}
                userId={userId}
                onAdd={() => handleOpenModal()}
                onEdit={(bot) => handleOpenModal(bot as any)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onViewWebhook={(bot) => handleOpenWebhookModal(bot as any)}
                onManualTrigger={(bot) => handleOpenManualTriggerModal(bot as any)}
            />

            <BotModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                exchanges={exchanges}
                initialData={editingBot ?? undefined}
            />

            <WebhookModal
                open={isWebhookModalOpen}
                onOpenChange={setIsWebhookModalOpen}
                bot={webhookBot}
            />

            <ManualTriggerModal
                open={isManualTriggerModalOpen}
                onOpenChange={setIsManualTriggerModalOpen}
                bot={manualTriggerBot}
                onConfirm={handleConfirmManualTrigger}
            />
        </div>
    )
}
