/**
 * Exchange Routes — /v1/exchanges
 * 
 * Handles exchange management and verification.
 */

import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../lib/db";
import { verifyBinanceCredentials } from "../binance/client";
import type { AppVariables } from "../types/trading";

export const exchangeRoutes = new Hono<{ Variables: AppVariables }>();

// All exchange routes require auth
exchangeRoutes.use("*", authMiddleware);

/**
 * [POST] /verify
 * Verify Binance API credentials without saving them.
 * Used by the frontend onboarding flow.
 */
exchangeRoutes.post("/verify", async (c) => {
    const body = await c.req.json();
    const { apiKey, apiSecret } = body as { apiKey: string; apiSecret: string };
    console.log("apiKey: ", apiKey, "apiSecret: ", apiSecret);

    if (!apiKey || !apiSecret) {
        return c.json({
            success: false,
            error: "apiKey and apiSecret are required"
        }, 400);
    }

    const result = await verifyBinanceCredentials({ apiKey, apiSecret });

    if (!result.success) {
        return c.json({
            success: false,
            error: result.error || "Invalid credentials",
            errorCode: result.errorCode
        }, 401);
    }

    return c.json({
        success: true,
        data: result.data
    });
});

/**
 * [POST] /:id/sync
 * Sync both Spot and Margin balances from Binance.
 */
exchangeRoutes.post("/:id/sync", async (c) => {
    const user = c.get("user");
    const { id: exchangeId } = c.req.param();

    const exchange = await db.exchange.findUnique({ where: { id: exchangeId } });

    if (!exchange) {
        return c.json({ success: false, error: "Exchange not found" }, 404);
    }

    if (user.role !== "ADMIN" && exchange.userId !== user.id) {
        return c.json({ success: false, error: "Forbidden" }, 403);
    }

    try {
        const { syncSpotAccount } = await import("../services/spot-sync");
        const { syncMarginAccount } = await import("../services/margin-sync");

        // Sync Spot
        const spotUsd = await syncSpotAccount(exchangeId, exchange);

        // Sync Margin
        const marginUsd = await syncMarginAccount(exchangeId, exchange);

        // Update Total Value, Spot USD, and Margin USD
        const updatedExchange = await db.exchange.update({
            where: { id: exchangeId },
            data: {
                spotUsd: spotUsd,
                marginUsd: marginUsd,
                totalValue: spotUsd.add(marginUsd),
                updatedAt: new Date(),
            },
        });

        return c.json({
            success: true,
            data: updatedExchange
        });
    } catch (error: any) {
        console.error(`[ExchangeSync] Error:`, error);
        return c.json({
            success: false,
            error: error.message || "Sync failed"
        }, 500);
    }
});
