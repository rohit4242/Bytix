"use server"

import db from "@/lib/db"
import { requireRole } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { api } from "@/lib/api"

/**
 * Fetch positions for a specific user.
 */
export async function getPositions(targetUserId: string, status?: "OPEN" | "CLOSED") {
    await requireRole("ADMIN", "AGENT")

    const positions = await db.position.findMany({
        where: {
            userId: targetUserId,
            ...(status && { status }),
        },
        include: {
            bot: {
                select: {
                    name: true,
                }
            },
            orders: {
                orderBy: { submittedAt: "desc" }
            }
        },
        orderBy: { openedAt: "desc" },
    })

    return JSON.parse(JSON.stringify(positions))
}

/**
 * Close a position only in the database (Admin Only).
 */
export async function closePositionDbOnly(positionId: string) {
    await requireRole("ADMIN")

    const position = await db.position.update({
        where: { id: positionId },
        data: {
            status: "CLOSED",
            closedAt: new Date(),
        },
        select: { userId: true }
    })

    revalidatePath(`/admin/view/${position.userId}/positions`)
    return { success: true }
}

/**
 * Force close a position on Binance via the backend API (Admin Only).
 */
export async function closePositionBinance(positionId: string, userId: string) {
    await requireRole("ADMIN")

    try {
        const response = await api.post(`/positions/${positionId}/close`)
        const data = response.data

        console.log("Binance close response:", data)

        if (userId) {
            revalidatePath(`/admin/view/${userId}/positions`)
        }

        return { success: true, data }
    } catch (err) {
        console.error("Binance close error:", err)
        return { success: false, error: err instanceof Error ? err.message : "Closure failed" }
    }
}
