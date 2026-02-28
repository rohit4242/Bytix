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
import { parseStringSignal } from "../services/signal-parser";

export const webhookRoutes = new Hono();

webhookRoutes.post("/bot/:botId", async (c) => {
    const { botId } = c.req.param();

    let payload: any = null;
    const rawText = await c.req.text();

    // 1. Try JSON parsing
    try {
        payload = JSON.parse(rawText);
        console.log("Webhook received (JSON):", JSON.stringify(payload));
    } catch {
        // 2. If not JSON, try string parsing
        console.log("Webhook received (Raw Text):", rawText);
        payload = parseStringSignal(rawText);

        if (!payload) {
            return c.json({
                success: false,
                error: "Invalid request body — expected JSON or valid string signal"
            });
        }
        console.log("Webhook parsed (String):", JSON.stringify(payload));
    }

    // 3. Validate payload schema (for JSON source, string source is already validated in parser but safe to re-check)
    const parsed = WebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        return c.json({
            success: false,
            error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
        });
    }

    // 4. Run the full pipeline — always returns 200
    const result = await runWebhookPipeline(botId, parsed.data);
    return c.json(result);
});
