import * as React from "react"
import { MainLayout } from "@/components/layout/main-layout"

export default function AgentLayout({ children }: { children: React.ReactNode }) {
    return <MainLayout role="agent">{children}</MainLayout>
}
