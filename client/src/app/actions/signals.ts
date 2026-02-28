"use server"

import db from "@/lib/db"
import { requireRole } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

/**
 * Fetch signal history for a specific user, optionally filtered by bot.
 * NOTE: Signals are linked to users via their parent Bot.
 */
export async function getSignals(targetUserId: string, botId?: string) {
    await requireRole("ADMIN", "AGENT")

    const signals = await db.signal.findMany({
        where: {
            bot: {
                userId: targetUserId,
                ...(botId && { id: botId }),
            },
        },
        orderBy: { createdAt: "desc" },
        include: {
            bot: { select: { name: true } },
        }
    })

    return JSON.parse(JSON.stringify(signals))
}

export async function deleteSignal(signalId: string) {
    await requireRole("ADMIN", "AGENT")

    const signal = await db.signal.delete({
        where: { id: signalId },
        include: { bot: { select: { userId: true } } }
    })

    revalidatePath(`/admin/view/${signal.bot.userId}/signals`)
}

export async function deleteAllSignals(targetUserId: string, botId?: string) {
    await requireRole("ADMIN", "AGENT")

    await db.signal.deleteMany({
        where: {
            bot: {
                userId: targetUserId,
                ...(botId && { id: botId }),
            },
        }
    })

    revalidatePath(`/admin/view/${targetUserId}/signals`)
}
