/**
 * Route Index — mounts all routers under /v1
 *
 * /webhooks  → no auth
 * /positions → authMiddleware (inside positions.ts)
 * /margin    → authMiddleware (inside margin.ts)
 * /internal  → authMiddleware (inside internal.ts)
 * /health    → no auth
 */

import { Hono } from "hono";
import { webhookRoutes } from "./webhooks";
import { positionRoutes } from "./positions";
import { marginRoutes } from "./margin";
import { internalRoutes } from "./internal";
import { exchangeRoutes } from "./exchanges";
import { tradingRoutes } from "./trading";

const router = new Hono();

// Health check
router.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Webhooks (no auth — verified by payload.secret)
router.route("/webhooks", webhookRoutes);

// Protected routes (auth inside each router)
router.route("/positions", positionRoutes);
router.route("/margin", marginRoutes);
router.route("/internal", internalRoutes);
router.route("/exchanges", exchangeRoutes);
router.route("/trading", tradingRoutes);

export default router;
