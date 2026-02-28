/**
 * Signal Parser Utility
 *
 * Parses underscore-separated string signals into WebhookPayload.
 * Format: ACTION_EXCHANGE_SYMBOL_BOTNAME_TIMEFRAME_SECRET
 * Example: ENTER-LONG_BINANCE_BTCUSDT_Sample_4M_e267d336-a8a5-4c4b-96ee-8b71983d30d3
 */

import { WebhookPayloadSchema, type WebhookPayload } from "../validation/signal.schema";

export function parseStringSignal(raw: string): WebhookPayload | null {
    if (!raw || typeof raw !== "string") return null;

    // Split by underscore
    const parts = raw.trim().split("_");
    if (parts.length < 3) return null;

    // 1. Action (1st part)
    // Normalize: ENTER-LONG -> ENTER_LONG, etc.
    let rawAction = parts[0].toUpperCase().replace(/-/g, "_");

    // 2. Symbol (3rd part usually, but let's be flexible)
    // In "ENTER-LONG_BINANCE_BTCUSDT_...", BTCUSDT is index 2
    const symbol = parts[2]?.toUpperCase();

    // 3. Secret (Last part)
    const secret = parts[parts.length - 1];

    if (!rawAction || !symbol || !secret) return null;

    const payload: any = {
        action: rawAction,
        symbol: symbol,
        secret: secret,
        message: `Parsed from raw string: ${raw}`,
    };

    // Validate against schema
    const result = WebhookPayloadSchema.safeParse(payload);
    if (!result.success) {
        console.warn(`[Parser] String signal validation failed:`, result.error.format());
        return null;
    }

    return result.data;
}
