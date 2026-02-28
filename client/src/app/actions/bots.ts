"use server"

import db from "@/lib/db"
import { api } from "@/lib/api"
import { requireRole } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { Bot, BotStatus } from "@/generated/prisma"
import { type BotWizardValues } from "@/app/(main)/admin/view/[userId]/bots/_components/bot-wizard/schema"

/**
 * Helper to sanitize bot data from Decimal objects to numbers.
 */
export type SanitizedBot = {
    id: string
    name: string
    description: string | null
    exchangeId: string
    tradeType: any
    tradeAmount: number
    amountUnit: string
    quantity: number
    leverage: number
    pairs: string[]
    orderType: any
    sideEffect: any
    slPercent: number | null
    tpPercent: number | null
    userId: string
    status: any
    createdAt: Date | string
    updatedAt: Date | string
    exchange: {
        name: string
        label: string | null
        availableBalance: number
        totalValue: number
    } | null
    positions?: { id: string }[]
}

function sanitizeBot(bot: any): SanitizedBot | null {
    if (!bot) return null
    return {
        ...bot,
        tradeAmount: bot.tradeAmount ? Number(bot.tradeAmount) : 0,
        quantity: bot.quantity ? Number(bot.quantity) : 0,
        slPercent: bot.slPercent ? Number(bot.slPercent) : null,
        tpPercent: bot.tpPercent ? Number(bot.tpPercent) : null,
        exchange: bot.exchange ? {
            ...bot.exchange,
            availableBalance: bot.exchange.availableBalance ? Number(bot.exchange.availableBalance) : 0,
            totalValue: bot.exchange.totalValue ? Number(bot.exchange.totalValue) : 0,
        } : null,
    }
}

/**
 * Fetch bots for a user.
 */
export async function getBots(targetUserId: string) {
    await requireRole("ADMIN", "AGENT")

    const bots = await db.bot.findMany({
        where: { userId: targetUserId },
        include: {
            exchange: { select: { name: true, label: true, availableBalance: true, totalValue: true } },
            positions: { where: { status: "OPEN" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    return bots.map(sanitizeBot)
}

/**
 * Fetch single bot with details.
 */
export async function getBot(botId: string) {
    await requireRole("ADMIN", "AGENT")

    const bot = await db.bot.findUnique({
        where: { id: botId },
        include: {
            user: { select: { name: true, email: true } },
            exchange: { select: { name: true, label: true, availableBalance: true, totalValue: true } },
            positions: {
                where: { status: "OPEN" },
                orderBy: { openedAt: "desc" }
            }
        }
    })

    return sanitizeBot(bot)
}

/**
 * Toggle bot active status.
 */
export async function toggleBot(botId: string, isActive: boolean) {
    await requireRole("ADMIN", "AGENT")

    const bot = await db.bot.update({
        where: { id: botId },
        data: { status: isActive ? BotStatus.ACTIVE : BotStatus.PAUSED },
        select: { userId: true }
    })

    revalidatePath(`/admin/view/${bot.userId}/bots`)
    revalidatePath(`/admin/view/${bot.userId}/bots/${botId}`)
}

/**
 * Delete a bot.
 */
export async function deleteBot(botId: string) {
    await requireRole("ADMIN", "AGENT")

    // Check for open positions first
    const openPositions = await db.position.count({
        where: { botId, status: "OPEN" }
    })

    if (openPositions > 0) {
        throw new Error("Cannot delete bot with active positions")
    }

    const bot = await db.bot.delete({
        where: { id: botId }
    })

    revalidatePath(`/admin/view/${bot.userId}/bots`)
}

/**
 * Create a new bot for a user.
 */
export async function createBot(targetUserId: string, values: BotWizardValues) {
    await requireRole("ADMIN", "AGENT")

    // Generate a random webhook secret
    const webhookSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    const bot = await db.bot.create({
        data: {
            name: values.name,
            description: values.description,
            exchangeId: values.exchangeId,
            tradeType: values.tradeType,
            tradeAmount: values.tradeAmount,
            amountUnit: values.amountUnit,
            quantity: values.quantity || 0,
            leverage: values.leverage,
            pairs: [values.symbol], // Wrap single symbol into array
            orderType: values.orderType,
            sideEffect: values.sideEffect,
            tpPercent: values.tpPercent,
            slPercent: values.slPercent,
            userId: targetUserId,
            webhookSecret,
            status: BotStatus.PAUSED,
        }
    })

    revalidatePath(`/admin/view/${targetUserId}/bots`)
    return sanitizeBot(bot)
}

/**
 * Update an existing bot.
 */
export async function updateBot(botId: string, values: BotWizardValues) {
    await requireRole("ADMIN", "AGENT")

    const bot = await db.bot.update({
        where: { id: botId },
        data: {
            name: values.name,
            description: values.description,
            exchangeId: values.exchangeId,
            tradeType: values.tradeType,
            tradeAmount: values.tradeAmount,
            amountUnit: values.amountUnit,
            quantity: values.quantity || 0,
            leverage: values.leverage,
            pairs: [values.symbol],
            orderType: values.orderType,
            sideEffect: values.sideEffect,
            tpPercent: values.tpPercent,
            slPercent: values.slPercent,
        }
    })

    revalidatePath(`/admin/view/${bot.userId}/bots`)
    revalidatePath(`/admin/view/${bot.userId}/bots/${botId}`)
    return sanitizeBot(bot)
}

/**
 * Get real exchange constraints and balance data from the backend
 */
export async function getExchangeConstraints(exchangeId: string, symbol: string) {
    try {
        const response = await api.get(`/trading/preview/${exchangeId}`, {
            params: { symbol }
        })

        if (response.data.success) {
            return response.data.data
        }

        throw new Error(response.data.error || "Failed to fetch constraints")
    } catch (error) {
        console.error("[getExchangeConstraints] Error:", error)
        return null
    }
}

/**
 * Fetch available trading pairs for an exchange.
 */
export async function getPairs(exchangeId: string) {
    await requireRole("ADMIN", "AGENT")

    try {
        const response = await api.get(`/trading/symbols/${exchangeId}`)

        if (response.data.success) {
            return response.data.data as string[]
        }
    } catch (error) {
        console.error("[getPairs] Error:", error)
    }

    // Fallback to mock pairs if backend fails or doesn't exist yet
    return ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT", "DOTUSDT", "DOGEUSDT"]
}

/**
 * Mock function to get simulation data (Required Margin, Buying Power)
 */
export async function getMockSimulationData() {
    return {
        totalBuyingPower: 30494.53,
        buyingPowerUsage: 0.3,
        navUsd: 38680.73,
        spotUsd: 7123.46,
        marginUsd: 31557.26
    }
}

/**
 * Manually trigger a signal for a bot by posting to the webhook endpoint.
 * The webhookSecret is read server-side and never exposed to the browser.
 * Returns the full pipeline result so the UI can show what happened.
 */
export async function triggerManualSignal(
    botId: string,
    action: string
): Promise<{
    success: boolean
    action?: string
    positionId?: string
    skipped?: boolean
    reason?: string
    error?: string
    signalId?: string
}> {
    await requireRole("ADMIN", "AGENT")

    // Fetch bot with webhookSecret — never sent to client
    const bot = await db.bot.findUnique({
        where: { id: botId },
        select: {
            webhookSecret: true,
            pairs: true,
            status: true,
        },
    })

    if (!bot) {
        return { success: false, error: "Bot not found" }
    }

    if (bot.status !== "ACTIVE") {
        return { success: false, error: `Bot is not active (status: ${bot.status})` }
    }

    if (!bot.webhookSecret) {
        return { success: false, error: "Bot has no webhook secret configured" }
    }

    const symbol = bot.pairs[0]
    if (!symbol) {
        return { success: false, error: "Bot has no trading pairs configured" }
    }

    try {
        const response = await api.post(`/webhooks/bot/${botId}`, {
            secret: bot.webhookSecret,
            action,
            symbol,
        })

        return response.data
    } catch (error: any) {
        const msg = error.response?.data?.error || error.message || "Failed to trigger signal"
        return { success: false, error: msg }
    }
}
