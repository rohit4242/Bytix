/**
 * Bytix API Server — Entry Point
 *
 * Hono app running on Bun.
 * Mounts all routes, registers global middleware, starts background services.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env";
import { auth } from "./lib/auth";
import { loggerMiddleware } from "./middleware/logger";
import { securityMiddleware } from "./middleware/security";
import { errorHandler } from "./middleware/error-handler";
import router from "./routes/index";
import { startWebSocketManager } from "./binance/websocket";
import { withPrisma } from "./lib/prisma";

// ─── App ──────────────────────────────────────────────────────────────────

const app = new Hono();

// Global Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// 1. Block malicious scans immediately
app.use("*", securityMiddleware);

// 2. Log accepted requests
app.use("*", loggerMiddleware);

app.use("*", withPrisma);
app.onError(errorHandler);

// Better Auth — /api/auth/** (session management, handled by client/)
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// API Routes — /v1/**
app.route("/v1", router);

// ─── Background Services ───────────────────────────────────────────────────

// Start WebSocket streams for all active exchanges
startWebSocketManager().catch((err) =>
  console.error("[Startup] WebSocket manager failed to start:", err)
);

// Initialize Price Monitor for TP/SL
import { priceMonitor } from "./services/price-monitor";
import { handleAutomatedExit } from "./services/signal-processor";

priceMonitor.onTargetHit = handleAutomatedExit;
priceMonitor.init().catch((err) =>
  console.error("[Startup] Price Monitor failed to start:", err)
);

// ─── Startup Log ───────────────────────────────────────────────────────────

console.log(`[🚀] Bytix API Server starting on port ${env.PORT}`);
console.log(`[🔗] Environment: ${env.NODE_ENV}`);

// ─── Bun Export ────────────────────────────────────────────────────────────

export default {
  port: env.PORT,
  fetch: app.fetch,
};
