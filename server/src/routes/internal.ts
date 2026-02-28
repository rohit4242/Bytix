/**
 * Internal Routes — /v1/internal
 *
 * Called by client/ Server Actions via Bearer token.
 * POST /signal       — manually trigger a signal (same flow as webhook)
 * POST /sync-margin  — force a margin account sync
 * POST /snapshot     — force a balance snapshot for the authenticated user
 *
 * Per doc 10.
 */

import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../lib/db";
import { getBinanceClient } from "../binance/client";
import { openPosition, closePosition } from "../services/signal-processor";
import type { AppVariables } from "../types/trading";
import type { SignalAction } from "../generated/prisma";

export const internalRoutes = new Hono<{ Variables: AppVariables }>();

internalRoutes.use("*", authMiddleware);

// ─── Manual Signal ─────────────────────────────────────────────────────────

internalRoutes.post("/signal", async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const { botId, action, symbol } = body as {
        botId: string;
        action: SignalAction;
        symbol: string;
    };

    if (!botId || !action || !symbol) {
        return c.json({ success: false, error: "botId, action, and symbol are required" }, 400);
    }

    const bot = await db.bot.findUnique({
        where: { id: botId },
        include: { exchange: true },
    });

    if (!bot) return c.json({ success: false, error: "Bot not found" }, 404);

    // Only owner or ADMIN
    if (user.role !== "ADMIN" && bot.userId !== user.id) {
        return c.json({ success: false, error: "Forbidden" }, 403);
    }

    if (!bot.pairs.includes(symbol)) {
        return c.json({ success: false, error: `Symbol ${symbol} not in bot pairs` }, 400);
    }

    const signal = await db.signal.create({
        data: {
            botId: bot.id,
            action,
            symbol,
            status: "PROCESSING",
            processed: true,
            rawPayload: { source: "internal_manual", userId: user.id },
        },
    });

    try {
        const openPos = await db.position.findFirst({ where: { botId: bot.id, status: "OPEN" } });
        let result: { action: string; positionId: string };

        if ((action === "EXIT_LONG" || action === "EXIT_SHORT") && openPos) {
            result = await closePosition(signal, bot, openPos);
        } else if (action === "ENTER_LONG" || action === "ENTER_SHORT") {
            result = await openPosition(signal, bot);
        } else {
            return c.json({ success: false, error: "No open position to close" }, 400);
        }

        await db.signal.update({
            where: { id: signal.id },
            data: { status: "PROCESSED", processedAt: new Date(), positionId: result.positionId },
        });

        return c.json({ success: true, signalId: signal.id, action: result.action, positionId: result.positionId });
    } catch (err) {
        await db.signal.update({
            where: { id: signal.id },
            data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Signal failed", processedAt: new Date() },
        }).catch(() => { });
        return c.json(
            { success: false, error: err instanceof Error ? err.message : "Signal failed" },
            500
        );
    }
});
