import { Context, Next } from "hono";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import type { AppVariables } from "../types/trading";

/**
 * Validates the Bearer token against the Session table.
 * Attaches the user to the Hono context for downstream handlers.
 */
export const authMiddleware = async (
    c: Context<{ Variables: AppVariables }>,
    next: Next
) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.split(" ")[1];

    // Use Better Auth's native session verification
    const session = await auth.api.getSession({
        headers: {
            authorization: `Bearer ${token}`,
        },
    });

    if (!session || !session.session || session.session.expiresAt < new Date()) {
        return c.json({ success: false, error: "Unauthorized or session expired" }, 401);
    }

    c.set("user", {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as AppVariables["user"]["role"],
        agentId: (session.user as any).agentId ?? null,
    });

    c.set("sessionToken", token);

    await next();
};
