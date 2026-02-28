import * as React from "react"

// Role-specific sub-layouts (admin/agent/customer) each wrap
// their own DashboardLayout with the appropriate nav config.
// This parent layout is a plain pass-through.
export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
