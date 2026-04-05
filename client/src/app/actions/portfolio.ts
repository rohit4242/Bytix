"use server"

import db from "@/lib/db"
import { requireRole } from "@/lib/auth-helpers"

/**
 * Fetch portfolio summary for a specific user.
 */
export async function getPortfolio(targetUserId: string) {
    await requireRole("ADMIN", "AGENT", "CUSTOMER")

    const [exchanges, closedPositions, openPositions, activeBots] = await Promise.all([
        db.exchange.findMany({
            where: { userId: targetUserId },
            select: { totalValue: true, availableBalance: true }
        }),
        db.position.findMany({
            where: { userId: targetUserId, status: "CLOSED" },
            select: { realizedPnl: true }
        }),
        db.position.findMany({
            where: { userId: targetUserId, status: "OPEN" },
            select: { unrealizedPnl: true }
        }),
        db.bot.count({
            where: { userId: targetUserId, status: "ACTIVE" }
        })
    ])

    const totalBalance = exchanges.reduce((acc, ex) => acc + Number(ex.totalValue), 0)
    const availableBalance = exchanges.reduce((acc, ex) => acc + Number(ex.availableBalance), 0)

    const realizedPnl = closedPositions.reduce((acc, pos) => acc + Number(pos.realizedPnl), 0)
    const unrealizedPnl = openPositions.reduce((acc, pos) => acc + Number(pos.unrealizedPnl), 0)

    const totalTrades = closedPositions.length
    const winningTrades = closedPositions.filter(pos => Number(pos.realizedPnl) > 0).length
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

    const startEquity = totalBalance - realizedPnl
    const pnlPercent = startEquity > 0 ? (realizedPnl / startEquity) * 100 : 0

    const data = {
        balance: totalBalance,
        available: availableBalance,
        totalPnl: realizedPnl, // Keep totalPnl for UI compatibility
        realizedPnl,
        unrealizedPnl,
        pnlPercent: Number(pnlPercent.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        totalTrades,
        openPositions: openPositions.length,
        activeBots,
    }

    return JSON.parse(JSON.stringify(data))
}

/**
 * Fetch Cumulative P&L history for the 30-day chart.
 */
export async function getSnapshots(targetUserId: string) {
    await requireRole("ADMIN", "AGENT", "CUSTOMER")

    // Fetch closed positions to build a P&L timeline
    const closedPositions = await db.position.findMany({
        where: {
            userId: targetUserId,
            status: "CLOSED",
            closedAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
        },
        orderBy: { closedAt: "asc" },
        select: { realizedPnl: true, closedAt: true }
    })

    const now = new Date()
    const days = 30
    const data = []

    // Create a map of dates to total P&L on that day
    const entriesByDate = new Map<string, number>()
    closedPositions.forEach(pos => {
        if (!pos.closedAt) return
        const dateStr = pos.closedAt.toISOString().split("T")[0]
        const current = entriesByDate.get(dateStr) || 0
        entriesByDate.set(dateStr, current + Number(pos.realizedPnl))
    })

    let cumulativePnl = 0

    // Build the 30-day series
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]

        // Add positions closed on this day to the cumulative total
        cumulativePnl += entriesByDate.get(dateStr) || 0

        data.push({
            date: dateStr,
            pnl: Number(cumulativePnl.toFixed(2)),
            // Compatibility for PortfolioChart interface if needed
            equity: Number(cumulativePnl.toFixed(2)),
            nav: 0
        })
    }

    // Force the first point to be 0 if the user has no history yet, 
    // to anchor the line properly at the start of the 30 days.
    if (data.length > 0 && data[0].pnl !== 0 && closedPositions.length === 0) {
        data[0].pnl = 0
    }

    return JSON.parse(JSON.stringify(data))
}
