import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url().optional(),
    BINANCE_BASE_URL: z.string().url().default("https://api.binance.com"),
    BINANCE_WS_URL: z.string().url().default("wss://stream.binance.com:9443"),
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Parse and validate process.env
// Throws a descriptive error on boot if any required vars are missing or invalid
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

