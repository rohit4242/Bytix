import { redirect } from "next/navigation"
import { getUserSession } from "./auth-server"
import db from "./db"

export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER"

// ─── Custom Errors ──────────────────────────────────────────────

export class AuthError extends Error {
    status = 401
    constructor(message: string) {
        super(message)
        this.name = "AuthError"
    }
}

export class NotFoundError extends Error {
    status = 404
    constructor(message: string) {
        super(message)
        this.name = "NotFoundError"
    }
}

export class ValidationError extends Error {
    status = 400
    constructor(message: string) {
        super(message)
        this.name = "ValidationError"
    }
}

export class ForbiddenError extends Error {
    status = 403
    constructor(message: string) {
        super(message)
        this.name = "ForbiddenError"
    }
}

// ─── Session Helpers ────────────────────────────────────────────

/** Use in every Server Action — throws AuthError if not logged in */
export async function requireAuth() {
    const session = await getUserSession()
    if (!session) throw new AuthError("Not authenticated")
    return session
}

/** Use when a route requires a specific role */
export async function requireRole(...roles: UserRole[]) {
    const session = await requireAuth()
    const roleString = (session.user as { role?: string }).role || ""
    const currentRole = roleString.toUpperCase() as UserRole
    if (!roles.includes(currentRole)) {
        redirect(`/unauthorized?source=requireRole&currentRole=${currentRole}&original=${roleString}`)
    }
    return session
}

// ─── Ownership Checks ───────────────────────────────────────────

/** Verify a bot belongs to the current user (or their customer if AGENT) */
export async function assertBotOwnership(
    userId: string,
    userRole: string,
    botId: string
) {
    const bot = await db.bot.findUnique({ where: { id: botId } })
    if (!bot) throw new NotFoundError("Bot not found")

    if (userRole === "ADMIN") return bot

    if (userRole === "CUSTOMER") {
        if (bot.userId !== userId) throw new ForbiddenError("Access denied")
        return bot
    }

    if (userRole === "AGENT") {
        const customer = await db.user.findFirst({
            where: { id: bot.userId, agentId: userId },
        })
        if (!customer) throw new ForbiddenError("Not your customer")
        return bot
    }

    throw new ForbiddenError("Access denied")
}

/** Verify an exchange belongs to the current user */
export async function assertExchangeOwnership(
    userId: string,
    userRole: string,
    exchangeId: string
) {
    const exchange = await db.exchange.findUnique({
        where: { id: exchangeId },
        select: { id: true, userId: true, label: true, name: true, isActive: true },
    })
    if (!exchange) throw new NotFoundError("Exchange not found")
    if (userRole !== "ADMIN" && exchange.userId !== userId) {
        throw new ForbiddenError("Access denied")
    }
    return exchange
}

/** Resolve userId for data queries — allows admin to scope to any user */
export function resolveUserId(
    sessionUserId: string,
    sessionUserRole: string,
    targetUserId?: string
): string {
    if (sessionUserRole === "ADMIN" && targetUserId) return targetUserId
    return sessionUserId
}
