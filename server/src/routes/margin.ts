/**
 * Margin Routes — /v1/margin
 *
 * All routes require authMiddleware.
 * POST /:exchangeId/sync — sync margin account from Binance
 * GET  /:exchangeId/risk — return current risk level
 *
 * Per docs 07, 08.
 */

import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../lib/db";
import type { AppVariables } from "../types/trading";

export const marginRoutes = new Hono<{ Variables: AppVariables }>();

marginRoutes.use("*", authMiddleware);

// ─── Get Risk Level ────────────────────────────────────────────────────────

marginRoutes.get("/:exchangeId/risk", async (c) => {
    const user = c.get("user");
    const { exchangeId } = c.req.param();

    const exchange = await db.exchange.findUnique({ where: { id: exchangeId } });

    if (!exchange) {
        return c.json({ success: false, error: "Exchange not found" }, 404);
    }

    if (user.role !== "ADMIN" && exchange.userId !== user.id) {
        return c.json({ success: false, error: "Forbidden" }, 403);
    }

    const marginAccounts = await db.marginAccount.findMany({
        where: { exchangeId },
        select: {
            id: true,
            marginType: true,
            riskLevel: true,
            marginLevel: true,
            liquidationPrice: true,
            lastSyncAt: true,
        },
    });

    return c.json({ success: true, exchangeId, marginAccounts });
});
