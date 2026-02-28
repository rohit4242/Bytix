"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Activity,
    Bot,
    Wallet,
    Signal
} from "lucide-react"

interface ViewNavProps {
    userId: string
}

export function ViewNav({ userId }: ViewNavProps) {
    const pathname = usePathname()

    const links = [
        {
            title: "Overview",
            href: `/admin/view/${userId}`,
            icon: LayoutDashboard,
            active: pathname === `/admin/view/${userId}`,
        },
        {
            title: "Positions",
            href: `/admin/view/${userId}/positions`,
            icon: Activity,
            active: pathname.startsWith(`/admin/view/${userId}/positions`),
        },
        {
            title: "Bots",
            href: `/admin/view/${userId}/bots`,
            icon: Bot,
            active: pathname.startsWith(`/admin/view/${userId}/bots`),
        },
        {
            title: "Exchanges",
            href: `/admin/view/${userId}/exchanges`,
            icon: Wallet,
            active: pathname.startsWith(`/admin/view/${userId}/exchanges`),
        },
        {
            title: "Signals",
            href: `/admin/view/${userId}/signals`,
            icon: Signal,
            active: pathname.startsWith(`/admin/view/${userId}/signals`),
        },
    ]

    return (
        <div className="flex border-b border-border/50 gap-4 overflow-x-auto no-scrollbar">
            {links.map((link) => {
                const Icon = link.icon
                return (
                    <Link
                        key={link.title}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-2 py-3 px-1 border-b-2 transition-all whitespace-nowrap",
                            link.active
                                ? "border-primary text-primary font-bold"
                                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
                        )}
                    >
                        <Icon className={cn("h-4 w-4", link.active ? "text-primary" : "text-muted-foreground/50")} />
                        <span className="text-xs uppercase tracking-widest">{link.title}</span>
                    </Link>
                )
            })}
        </div>
    )
}
