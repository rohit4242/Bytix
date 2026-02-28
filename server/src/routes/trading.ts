/**
 * Trading Routes — /v1/trading
 */

import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { db } from "../lib/db";
import { getTradingPreview } from "../services/trading-preview";
import type { AppVariables } from "../types/trading";

export const tradingRoutes = new Hono<{ Variables: AppVariables }>();

// All trading routes require auth
tradingRoutes.use("*", authMiddleware);

/**
 * [GET] /preview/:exchangeId?symbol=BTCUSDT
 * Returns consolidated data for trading preview (constraints, balances, margin).
 */
tradingRoutes.get("/preview/:exchangeId", async (c) => {
    const user = c.get("user");
    const { exchangeId } = c.req.param();
    const symbol = c.req.query("symbol");

    console.log("[Trading Preview] Request for", symbol, "on exchange", exchangeId);

    if (!symbol) {
        return c.json({ success: false, error: "Symbol query parameter is required" }, 400);
    }

    // 1. Fetch Exchange
    const exchange = await db.exchange.findUnique({
        where: { id: exchangeId }
    });

    if (!exchange) {
        return c.json({ success: false, error: "Exchange not found" }, 404);
    }

    // 2. Ownership Check
    if (user.role !== "ADMIN" && exchange.userId !== user.id) {
        return c.json({ success: false, error: "Forbidden" }, 403);
    }

    try {
        // 3. Fetch Preview Data
        const previewData = await getTradingPreview(exchange, symbol.toUpperCase());

        console.log("[Trading Preview] Success for", symbol, ":", previewData);
        return c.json({
            success: true,
            data: previewData
        });
    } catch (error: any) {
        console.error(`[Trading Preview] Error for ${symbol}:`, error);
        return c.json({
            success: false,
            error: error.message || "Failed to fetch trading preview"
        }, 500);
    }
});
