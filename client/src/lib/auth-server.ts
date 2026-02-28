import { headers } from "next/headers";
import { createAuthClient } from "better-auth/client";

const client = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    user: {
        additionalFields: {
            role: {
                type: "string",
            },
        },
    },
});

export async function getUserSession() {
    const session = await client.getSession({
        fetchOptions: {
            headers: await headers(),
        },
    });
    return session.data;
}
