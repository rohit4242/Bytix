import { cors } from "hono/cors";

export const corsMiddleware = cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type", "set-auth-token"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length", "set-auth-token"],
    maxAge: 600,
    credentials: true,
});
