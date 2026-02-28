/**
 * Position Routes — /v1/positions
 *
 * All routes require authMiddleware.
 * POST /:positionId/close       — close own position (or assigned customer's)
 * GET  /:positionId/sync        — force-sync position from Binance
 * POST /:positionId/force-close — admin only: close any position
 *
 * Per docs 04, 10.
 */

import { Hono } from "hono";
import { db } from "../lib/db";
import { getOrderStatus } from "../binance/spot";
import { getMarginOrderStatus } from "../binance/margin";
import { getBinanceClient } from "../binance/client";
import { mapBinanceStatus } from "../binance/utils";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import { assertPositionOwnership, ForbiddenError } from "../lib/ownership";
import { closePosition } from "../services/signal-processor";
import { updateSignalStatus } from "../services/signal-pipeline";
import type { AppVariables } from "../types/trading";

export const positionRoutes = new Hono<{ Variables: AppVariables }>();

// All position routes require a valid session
positionRoutes.use("*", authMiddleware);

// ─── Close Position ────────────────────────────────────────────────────────

positionRoutes.post("/:positionId/close", async (c) => {
    const user = c.get("user");
    const { positionId } = c.req.param();

    const position = await db.position.findUnique({
        where: { id: positionId },
        include: {
            user: { select: { agentId: true } },
            bot: { include: { exchange: true } },
        },
    });

    if (!position) {
        return c.json({ success: false, error: "Position not found" }, 404);
    }

    // Ownership check
    try {
        assertPositionOwnership(user, position);
    } catch (err) {
        if (err instanceof ForbiddenError) {
            return c.json({ success: false, error: err.message }, 403);
        }
        throw err;
    }

    if (position.status !== "OPEN") {
        return c.json({ success: false, error: "Position is not open" }, 400);
    }

    if (!position.bot?.exchange) {
        return c.json({ success: false, error: "Position has no associated bot/exchange" }, 400);
    }

    // Create a synthetic EXIT signal and process it
    const exitAction = position.side === "LONG" ? "EXIT_LONG" : "EXIT_SHORT";

    const signal = await db.signal.create({
        data: {
            botId: position.botId!,
            action: exitAction,
            symbol: position.symbol,
            status: "PROCESSING",
            processed: true,
            rawPayload: { source: "manual_close", userId: user.id },
        },
    });

    try {
        const result = await closePosition(signal, position.bot, position);
        await updateSignalStatus(signal.id, "PROCESSED", { positionId });
        return c.json({ success: true, positionId, action: result.action });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Close failed";
        await updateSignalStatus(signal.id, "FAILED", { errorMessage: msg });
        return c.json(
            { success: false, error: msg },
            500
        );
    }
});

// ─── Sync Position ──────────────────────────────────────────────────────────

positionRoutes.get("/:positionId/sync", async (c) => {
    const user = c.get("user");
    const { positionId } = c.req.param();

    const position = await db.position.findUnique({
        where: { id: positionId },
        include: {
            user: { select: { agentId: true } },
            orders: true,
            bot: { include: { exchange: true } },
        },
    });

    if (!position) {
        return c.json({ success: false, error: "Position not found" }, 404);
    }

    try {
        assertPositionOwnership(user, position);
    } catch (err) {
        if (err instanceof ForbiddenError) {
            return c.json({ success: false, error: err.message }, 403);
        }
        throw err;
    }

    if (!position.bot?.exchange) {
        return c.json({ success: false, error: "Position has no associated exchange" }, 400);
    }

    // Check each non-terminal order against Binance
    let synced = 0;
    for (const order of position.orders) {
        if (!order.binanceOrderId || ["FILLED", "CANCELED", "REJECTED", "EXPIRED", "ERROR"].includes(order.status)) {
            continue;
        }

        try {
            let result;
            if (position.tradeType === "MARGIN") {
                const { margin } = getBinanceClient(position.bot.exchange);
                result = await getMarginOrderStatus(margin, {
                    symbol: order.symbol,
                    orderId: parseInt(order.binanceOrderId, 10),
                });
            } else {
                const { spot } = getBinanceClient(position.bot.exchange);
                result = await getOrderStatus(spot, {
                    symbol: order.symbol,
                    orderId: parseInt(order.binanceOrderId, 10),
                });
            }

            if (result.success && result.data) {
                const binanceOrder = result.data;
                const newStatus = mapBinanceStatus(String(binanceOrder.status ?? ""));
                if (newStatus !== order.status) {
                    await db.order.update({
                        where: { id: order.id },
                        data: { status: newStatus, filledAt: newStatus === "FILLED" ? new Date() : null },
                    });
                    synced++;
                }
            }
        } catch {
            // Log but don't fail the whole sync
        }
    }

    await db.position.update({
        where: { id: positionId },
        data: { lastSyncAt: new Date(), isReconciled: true },
    });

    return c.json({ success: true, positionId, ordersSynced: synced });
});

// ─── Force Close (Admin Only) ─────────────────────────────────────────────

positionRoutes.post(
    "/:positionId/force-close",
    requireRole("ADMIN"),
    async (c) => {
        const { positionId } = c.req.param();

        const position = await db.position.findUnique({
            where: { id: positionId },
            include: { bot: { include: { exchange: true } } },
        });

        if (!position) {
            return c.json({ success: false, error: "Position not found" }, 404);
        }

        if (position.status !== "OPEN") {
            return c.json({ success: false, error: "Position is not open" }, 400);
        }

        if (!position.bot?.exchange) {
            return c.json({ success: false, error: "Position has no associated bot/exchange" }, 400);
        }

        const exitAction = position.side === "LONG" ? "EXIT_LONG" : "EXIT_SHORT";

        const signal = await db.signal.create({
            data: {
                botId: position.botId!,
                action: exitAction,
                symbol: position.symbol,
                status: "PROCESSING",
                processed: true,
                rawPayload: { source: "admin_force_close" },
            },
        });

        try {
            const result = await closePosition(signal, position.bot, position);
            await updateSignalStatus(signal.id, "PROCESSED", { positionId });
            return c.json({ success: true, positionId, action: result.action });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Force close failed";
            await updateSignalStatus(signal.id, "FAILED", { errorMessage: msg });
            return c.json(
                { success: false, error: msg },
                500
            );
        }
    }
);
