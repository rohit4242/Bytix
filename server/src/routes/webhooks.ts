/**
 * Webhook Route — POST /v1/webhooks/bot/:botId
 *
 * NO auth middleware — webhook auth is via payload.secret matching bot.webhookSecret.
 * Always returns HTTP 200 to prevent TradingView retries.
 *
 * Per docs 03, 10.
 */

import { Hono } from "hono";
import { WebhookPayloadSchema } from "../validation/signal.schema";
import { runWebhookPipeline } from "../services/signal-pipeline";

export const webhookRoutes = new Hono();

webhookRoutes.post("/bot/:botId", async (c) => {
    const { botId } = c.req.param();

    // Parse body — TradingView sends JSON but handle raw text too
    let rawBody: unknown;
    try {
        const contentType = c.req.header("content-type") ?? "";
        if (contentType.includes("application/json")) {
            rawBody = await c.req.json();
        } else {
            rawBody = JSON.parse(await c.req.text());
        }
    } catch {
        return c.json({ success: false, error: "Invalid request body — expected JSON" });
    }

    console.log("Webhook received:", JSON.stringify(rawBody));

    // Validate payload schema
    const parsed = WebhookPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
        return c.json({
            success: false,
            error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        });
    }

    // Run the full pipeline — always returns 200
    const result = await runWebhookPipeline(botId, parsed.data);
    return c.json(result);
});
