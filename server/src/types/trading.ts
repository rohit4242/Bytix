/**
 * Hono Context Variables — type for c.get() / c.set()
 *
 * AppVariables: the shape of all values stored on the Hono context.
 * Set in authMiddleware, consumed by route handlers and requireRole.
 *
 * PnlResult: exported here for consumers that need to reference it.
 */

import { Decimal } from "../generated/prisma/runtime/client";


// ─── Hono Context Variables ────────────────────────────────────────────────

export type AppUser = {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "AGENT" | "CUSTOMER";
    agentId: string | null;
};

export type AppVariables = {
    user: AppUser;
    sessionToken: string;
};

// ─── P&L Result ──────────────────────────────────────────────────────────

export interface PnlResult {
    realized: Decimal;
    percent: Decimal;
    percentOnCapital: Decimal;
}
