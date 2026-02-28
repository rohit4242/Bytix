"use client"

import { IconChevronRight } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { navIconMap, type NavItem } from "@/lib/nav-config"

export function NavMain({
    items,
    title,
}: {
    items: NavItem[]
    title?: string
}) {
    const pathname = usePathname()

    return (
        <SidebarGroup>
            {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const hasSubitems = item.items && item.items.length > 0
                        const isChildActive = hasSubitems
                            ? item.items!.some((sub) => pathname === sub.url)
                            : false
                        const isActive = pathname === item.url || isChildActive
                        const IconComponent = item.icon ? navIconMap[item.icon] : null

                        // Render flat item
                        if (!hasSubitems) {
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={isActive}
                                    >
                                        <Link href={item.url}>
                                            {IconComponent && <IconComponent size={18} />}
                                            <span>{item.title}</span>
                                            {item.badge && (
                                                <Badge className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground group-data-[collapsible=icon]:hidden">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )
                        }

                        // Render collapsible item
                        return (
                            <Collapsible
                                key={item.title}
                                asChild
                                defaultOpen={isActive || item.isActive}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                                            {IconComponent && <IconComponent size={18} />}
                                            <span>{item.title}</span>
                                            {item.badge && (
                                                <Badge className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground group-data-[collapsible=icon]:hidden">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                            <IconChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items!.map((sub) => (
                                                <SidebarMenuSubItem key={sub.title}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={pathname === sub.url}
                                                    >
                                                        <Link href={sub.url}>
                                                            <span>{sub.title}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
