import * as React from "react"
import { MainLayout } from "@/components/layout/main-layout"

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return <MainLayout role="customer">{children}</MainLayout>
}
