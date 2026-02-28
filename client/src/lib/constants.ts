export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER";

export const roleRedirectURL: Record<UserRole, string> = {
    ADMIN: "/admin",
    AGENT: "/agent/settings",
    CUSTOMER: "/customer/settings",
} as const;
