import { Context, Next } from "hono";
import { Role } from "../generated/prisma";

export const requireRole = (...roles: Role[]) => {
    return async (c: Context, next: Next) => {
        const user = c.get("user");

        if (!user) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        if (!roles.includes(user.role as Role)) {
            return c.json({ success: false, error: "Forbidden — insufficient role" }, 403);
        }

        await next();
    };
};
