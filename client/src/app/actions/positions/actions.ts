"use server"

import { requireRole } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { MOCK_POSITIONS, MOCK_ORDERS } from "./mock-data"
import { Position, Order } from "./types"

export async function getPositions(userId: string) {
    await requireRole("ADMIN", "AGENT")
    // In actual implementation, this will fetch from DB
    return MOCK_POSITIONS
}

export async function getPositionDetail(positionId: string) {
    await requireRole("ADMIN", "AGENT")
    const position = MOCK_POSITIONS.find(p => p.id === positionId)
    const orders = MOCK_ORDERS.filter(o => o.positionId === positionId)
    return { position, orders }
}

export async function closePosition(positionId: string) {
    await requireRole("ADMIN", "AGENT")
    console.log(`[Action] Requesting to close position: ${positionId}`)
    // This would call backend to execute market order
    // For now it's just a mock action
    return { success: true }
}
