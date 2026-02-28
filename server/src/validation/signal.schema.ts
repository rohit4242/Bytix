/**
 * Signal Webhook Payload Schema
 *
 * Validates the JSON body sent by TradingView or any other alerting tool.
 * Expected format: { secret, action, symbol, price?, message? }
 */

import { z } from "zod";

export const WebhookPayloadSchema = z.object({
    secret: z.string().min(1, "Webhook secret is required"),
    action: z.enum(
        ["ENTER_LONG", "EXIT_LONG", "ENTER_SHORT", "EXIT_SHORT"],
        { message: "Action must be one of: ENTER_LONG, EXIT_LONG, ENTER_SHORT, EXIT_SHORT" }
    ),
    symbol: z
        .string()
        .min(1, "Symbol is required")
        .transform((val) => val.toUpperCase())
        .refine((val) => /^[A-Z0-9]+$/.test(val), {
            message: "Symbol must contain only letters and numbers",
        }),
    price: z.number().positive().optional(),
    message: z.string().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
