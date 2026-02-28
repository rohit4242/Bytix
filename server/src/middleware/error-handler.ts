import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ForbiddenError } from "../lib/ownership";

export const errorHandler = (err: Error, c: Context) => {
    if (err instanceof ForbiddenError) {
        return c.json({ success: false, error: err.message }, 403);
    }

    if (err instanceof HTTPException) {
        return c.json({ success: false, error: err.message }, err.status);
    }

    console.error("[Global Error]", err);

    // Do not expose internal error details to client
    return c.json({ success: false, error: "Internal Server Error" }, 500);
};
