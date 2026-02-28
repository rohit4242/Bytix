import { z } from "zod";

export const createExchangeSchema = z.object({
    name: z.string().min(1, "Exchange name is required"),
    apiKey: z.string().min(1, "API Key is required"),
    apiSecret: z.string().min(1, "API Secret is required"),
    positionMode: z.enum(["ONE_WAY", "HEDGE"]).optional().default("ONE_WAY"),
});

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
