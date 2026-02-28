"use server"

import db from "@/lib/db"
import { requireRole } from "@/lib/auth-helpers"
import { Role } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

/**
 * Fetch all users with their role, agent assignment, and count of bots/positions.
 * ADMIN only.
 */
export async function getUsers() {
    await requireRole("ADMIN")

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    bots: true,
                    positions: true,
                },
            },
        },
    })

    return users
}

/**
 * Update a user's role.
 * ADMIN only.
 */
export async function updateUserRole(userId: string, role: Role) {
    await requireRole("ADMIN")

    await db.user.update({
        where: { id: userId },
        data: { role },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/view/${userId}`)
}

/**
 * Assign a customer to an agent.
 * ADMIN only.
 */
export async function assignAgent(customerId: string, agentId: string | null) {
    await requireRole("ADMIN")

    await db.user.update({
        where: { id: customerId },
        data: { agentId },
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/view/${customerId}`)
    revalidatePath("/agent/customers")
}

/**
 * Fetch all agents for selection in the user table.
 */
export async function getAgents() {
    await requireRole("ADMIN")

    return db.user.findMany({
        where: { role: Role.AGENT },
        select: { id: true, name: true, email: true },
    })
}

/**
 * Fetch users available for the search/selector context.
 * ADMIN: returns all users.
 * AGENT: returns only assigned customers.
 */
export async function getSelectorUsers() {
    const session = await requireRole("ADMIN", "AGENT")
    const user = session.user as unknown as { id: string, role: string }
    const { id: userId, role } = user

    if (role === "ADMIN") {
        return db.user.findMany({
            where: {
                id: { not: userId },
                role: { in: [Role.CUSTOMER, Role.AGENT] }
            },
            select: { id: true, name: true, email: true, image: true, role: true },
            orderBy: { name: "asc" },
        })
    }

    // Role is AGENT
    return db.user.findMany({
        where: {
            id: { not: userId },
            agentId: userId,
            role: Role.CUSTOMER
        },
        select: { id: true, name: true, email: true, image: true, role: true },
        orderBy: { name: "asc" },
    })
}
