"use server"

import db from "@/lib/db"
import { requireRole } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { api } from "@/lib/api"

import { ExchangeName, PositionMode, Exchange } from "@/generated/prisma"

/**
 * Helper to sanitize exchange data from Decimal objects to numbers.
 */
export type SanitizedExchange = Omit<Exchange, 'spotUsd' | 'marginUsd' | 'totalValue' | 'availableBalance'> & {
    spotUsd: number
    marginUsd: number
    totalValue: number
    availableBalance: number
    _count?: { bots: number }
}

function sanitizeExchange(exchange: any): SanitizedExchange | null {
    if (!exchange) return null
    return {
        ...exchange,
        spotUsd: exchange.spotUsd ? Number(exchange.spotUsd) : 0,
        marginUsd: exchange.marginUsd ? Number(exchange.marginUsd) : 0,
        availableBalance: exchange.availableBalance ? Number(exchange.availableBalance) : 0,
        totalValue: exchange.totalValue ? Number(exchange.totalValue) : 0,
    }
}

/**
 * Fetch exchanges for a specific user.
 */
export async function getExchanges(targetUserId: string) {
    await requireRole("ADMIN", "AGENT")

    const exchanges = await db.exchange.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { bots: true }
            }
        }
    })

    return exchanges.map(sanitizeExchange) as SanitizedExchange[]
}

/**
 * Verify Binance credentials with the backend.
 */
export async function verifyExchangeCredentials(apiKey: string, apiSecret: string) {
    await requireRole("ADMIN", "AGENT")

    try {
        const response = await api.post("/exchanges/verify", {
            apiKey,
            apiSecret
        })

        return response.data
    } catch (error: any) {
        if (error.response?.data) {
            throw new Error(error.response.data.error || "Verification failed")
        }
        throw new Error("Backend service unavailable")
    }
}


/**
 * Create or update an exchange connection.
 */
export async function upsertExchange(data: {
    id?: string
    userId: string
    label: string
    apiKey: string
    apiSecret: string
    positionMode: PositionMode
    isActive?: boolean
}) {
    await requireRole("ADMIN")

    const exchangeData: any = {
        userId: data.userId,
        name: ExchangeName.BINANCE,
        label: data.label,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        positionMode: data.positionMode,
    }

    if (data.isActive !== undefined) {
        exchangeData.isActive = data.isActive
    } else if (!data.id) {
        exchangeData.isActive = true
    }

    if (data.id) {
        await db.exchange.update({
            where: { id: data.id },
            data: exchangeData
        })
    } else {
        await db.exchange.create({
            data: exchangeData
        })
    }

    revalidatePath(`/admin/view/${data.userId}/exchanges`)
}

/**
 * Toggle exchange active status.
 */
export async function toggleExchange(exchangeId: string, isActive: boolean) {
    await requireRole("ADMIN", "AGENT")

    const exchange = await db.exchange.update({
        where: { id: exchangeId },
        data: { isActive },
        select: { userId: true }
    })

    revalidatePath(`/admin/view/${exchange.userId}/exchanges`)
}

/**
 * Delete an exchange connection.
 */
export async function deleteExchange(exchangeId: string) {
    await requireRole("ADMIN", "AGENT")

    // Check for active bots first
    const activeBots = await db.bot.count({
        where: { exchangeId, status: "ACTIVE" }
    })

    if (activeBots > 0) {
        throw new Error("Cannot delete exchange with active bots. Pause bots first.")
    }

    const exchange = await db.exchange.delete({
        where: { id: exchangeId }
    })

    revalidatePath(`/admin/view/${exchange.userId}/exchanges`)
}

/**
 * Sync exchange balances with the backend.
 */
export async function syncExchange(exchangeId: string) {
    await requireRole("ADMIN", "AGENT")

    try {
        const response = await api.post(`/exchanges/${exchangeId}/sync`)

        // Revalidate the current page to show updated balances
        revalidatePath(`/admin/view/`) // Revalidate more broadly or specific path if known

        return response.data
    } catch (error: any) {
        console.error("[Sync Action] Error:", error.response?.data || error.message)
        throw new Error(error.response?.data?.error || "Failed to sync exchange balances")
    }
}
