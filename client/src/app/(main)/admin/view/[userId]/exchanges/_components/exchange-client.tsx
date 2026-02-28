"use client"

import * as React from "react"
import { upsertExchange, toggleExchange, deleteExchange, verifyExchangeCredentials } from "@/app/actions/exchanges"
import { toast } from "sonner"
import { PositionMode } from "@/generated/prisma"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { ExchangeHeader } from "./exchange-header"
import { ExchangeList } from "./exchange-list"
import { ExchangeModal } from "./exchange-modal"
import { useRouter } from "next/navigation"

import { type SanitizedExchange } from "@/app/actions/exchanges"

interface ExchangeClientProps {
    userId: string
    initialExchanges: SanitizedExchange[]
}

export function ExchangeClient({ userId, initialExchanges }: ExchangeClientProps) {
    const [isActionLoading, setIsActionLoading] = React.useState(false)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
    const [editingExchange, setEditingExchange] = React.useState<SanitizedExchange | null>(null)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [verificationStatus, setVerificationStatus] = React.useState<"idle" | "verifying" | "success" | "error">("idle")
    const [verificationError, setVerificationError] = React.useState<string | null>(null)

    const router = useRouter()

    const handleOpenModal = (exchange: SanitizedExchange | null = null) => {
        setEditingExchange(exchange)
        setVerificationStatus("idle")
        setVerificationError(null)
        setIsModalOpen(true)
    }

    const handleSubmit = async (formData: any) => {
        setIsActionLoading(true)
        try {
            // 1. Verify credentials if they were changed
            if (formData.apiKey || formData.apiSecret) {
                setVerificationStatus("verifying")
                setVerificationError(null)

                const verifyResult = await verifyExchangeCredentials(
                    formData.apiKey || "",
                    formData.apiSecret || ""
                )

                if (!verifyResult.success) {
                    setVerificationStatus("error")
                    setVerificationError(verifyResult.error || "Invalid API credentials")
                    throw new Error(verifyResult.error || "Invalid API credentials")
                }

                setVerificationStatus("success")
                // Wait a bit to show the success state before moving on
                await new Promise(resolve => setTimeout(resolve, 800))
            }

            // 2. Persist data
            await upsertExchange({
                id: editingExchange?.id,
                userId,
                label: formData.label,
                apiKey: formData.apiKey,
                apiSecret: formData.apiSecret,
                positionMode: formData.positionMode,
                isActive: editingExchange?.isActive
            })
            toast.success(editingExchange ? "Exchange updated" : "Exchange connected")
            setIsModalOpen(false)

            router.refresh()
        } catch (error: any) {
            setVerificationStatus("error")
            setVerificationError(error.message || "Failed to verify credentials")
            toast.error(error.message || "Failed to save exchange", { id: "verify" })
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleToggleStatus = async (id: string, targetStatus: boolean) => {
        try {
            await toggleExchange(id, targetStatus)
            toast.success("Status updated")
            router.refresh()
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    const confirmDelete = (id: string) => {
        setDeletingId(id)
        setIsDeleteModalOpen(true)
    }

    const handleDeleteConnection = async () => {
        if (!deletingId) return
        setIsActionLoading(true)
        try {
            await deleteExchange(deletingId)
            toast.success("Connection removed")
            setIsDeleteModalOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to remove connection")
        } finally {
            setIsActionLoading(false)
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-8">
            <ExchangeHeader onAdd={() => handleOpenModal()} />

            <ExchangeList
                exchanges={initialExchanges}
                onEdit={handleOpenModal}
                onDelete={confirmDelete}
                onToggle={handleToggleStatus}
            />

            <ExchangeModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSubmit={handleSubmit}
                isLoading={isActionLoading}
                verificationStatus={verificationStatus}
                verificationError={verificationError}
                initialData={editingExchange ? {
                    id: editingExchange.id,
                    label: editingExchange.label || "",
                    apiKey: editingExchange.apiKey,
                    apiSecret: editingExchange.apiSecret,
                    positionMode: editingExchange.positionMode
                } : undefined}
            />

            <ConfirmationDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Disconnect Account?"
                description="This will remove the API connection and potentially affect running bots. Are you sure?"
                onConfirm={handleDeleteConnection}
                isLoading={isActionLoading}
            />
        </div>
    )
}
