"use client"

import * as React from "react"
import { IconBolt } from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { UserSelector } from "./user-selector"
import { getAdminViewGroups, type SidebarData } from "@/lib/nav-config"
import { useViewStore } from "@/stores/use-view-store"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData: SidebarData
}

export function AppSidebar({
  sidebarData,
  ...props
}: AppSidebarProps) {
  const { selectedUserId } = useViewStore()

  // Dynamically inject User Context links if a customer is selected (for Admin)
  const isViewingContext = !!selectedUserId && sidebarData.user.role === "ADMIN"
  const viewGroups = isViewingContext ? getAdminViewGroups(selectedUserId) : []

  // Combine native data with dynamic context data
  const combinedNavGroups = [...viewGroups, ...sidebarData.navGroups]
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-auto px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent cursor-default">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <IconBolt className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-black tracking-tighter uppercase italic">Bytix</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {(sidebarData.user.role === "ADMIN" || sidebarData.user.role === "AGENT") && (
          <UserSelector role={sidebarData.user.role as "ADMIN" | "AGENT"} />
        )}
      </SidebarHeader>

      <SidebarContent>
        {combinedNavGroups.map((group) => (
          <NavMain key={group.title} title={group.title} items={group.items} />
        ))}
        {/* mt-auto pushes the secondary nav down to the bottom above the footer */}
        <NavSecondary items={sidebarData.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}