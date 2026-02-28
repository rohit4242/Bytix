"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import {
    adminSidebarData,
    agentSidebarData,
    customerSidebarData,
    type SidebarData,
} from "@/lib/nav-config"

export type PortalRole = "admin" | "agent" | "customer"

const sidebarDataMap: Record<PortalRole, SidebarData> = {
    admin: adminSidebarData,
    agent: agentSidebarData,
    customer: customerSidebarData,
}

interface MainLayoutProps {
    children: React.ReactNode
    role: PortalRole
}

export function MainLayout({
    children,
    role,
}: MainLayoutProps) {
    const sidebarData = sidebarDataMap[role]

    return (
        <SidebarProvider>
            <AppSidebar sidebarData={sidebarData} variant="sidebar" />
            <SidebarInset>
                <Header />
                {/* The p-4 pt-0 gap-4 matches exact Shadcn dashboard spacing */}
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
