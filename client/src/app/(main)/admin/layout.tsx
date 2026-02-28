import * as React from "react"
import { requireRole } from "@/lib/auth-helpers"
import { MainLayout } from "@/components/layout/main-layout"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Server-side guard
    await requireRole("ADMIN")

    return <MainLayout role="admin">{children}</MainLayout>
}
