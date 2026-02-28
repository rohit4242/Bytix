import type { Context, Next } from "hono";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

// Instantiate a single PrismaClient and reuse it across requests
// Following Hono + Prisma best practices for long-lived servers.
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Hono Middleware to inject Prisma Client into context.
 * Usage: c.get("prisma")
 */
export async function withPrisma(c: Context, next: Next) {
    if (!c.get("prisma")) {
        (c as any).set("prisma", prisma);
    }
    await next();
}

export { prisma };
