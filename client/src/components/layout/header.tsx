"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  IconSearch,
  IconCommand,
} from "@tabler/icons-react"
import { ModeToggle } from "@/components/mode-toggle"
import { ServerStatus } from "@/components/server-status"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"

export function Header() {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join("/")}`
    const isLast = index === pathSegments.length - 1

    // Format label: capitalize and replace hyphens
    let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

    // Special handling for common IDs (UUIDs or NanoIDs are usually long)
    if (segment.length > 20) {
      label = "Details"
    }

    return { label, href, isLast }
  })

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-300">
      <div className="flex items-center gap-3">
        <SidebarTrigger variant="outline" className="h-9 w-9 -ml-1 border-input/50 shadow-sm hover:bg-accent" />
        <Separator orientation="vertical" className="h-4 bg-border/50" />

        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors">
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbSeparator className="text-muted-foreground/30" />
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-foreground">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors">
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
        {/* Search */}
        <div className="relative hidden sm:flex items-center group max-w-sm w-full">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <Input
            type="search"
            placeholder="Search"
            className="h-9 w-full rounded-xl bg-muted/30 border-input/30 pl-10 pr-12 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border bg-background/50 font-mono text-[9px] font-bold text-muted-foreground/60 shadow-sm pointer-events-none">
            <IconCommand className="size-3" />
            <span>K</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />

          <div className="h-6 w-px bg-border/30 mx-1 hidden sm:block" />

          <ServerStatus className="hidden lg:flex" />
        </div>
      </div>
    </header>
  )
}