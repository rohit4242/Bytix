"use client"

import {
  IconBadge,
  IconBell,
  IconCreditCard,
  IconLogout2,
  IconSelector,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"

interface SidebarUser {
  name: string
  email: string
  avatar: string
  role: string
}

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.replace("/sign-in")
    router.refresh()
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <IconSelector className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-2 shadow-2xl border-input/30"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm bg-muted/30 rounded-lg mb-2">
                <Avatar className="h-9 w-9 rounded-lg border shadow-sm">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-foreground">{user.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuGroup className="space-y-1">
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground px-2 py-1">
                ACCOUNT
              </DropdownMenuLabel>
              <DropdownMenuItem className="rounded-lg cursor-pointer py-2">
                <IconUserCircle className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Profile Details</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg cursor-pointer py-2 text-destructive focus:bg-destructive/10 focus:text-destructive group"
            >
              <IconLogout2 className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}