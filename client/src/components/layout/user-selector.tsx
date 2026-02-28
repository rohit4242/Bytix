"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Check, ChevronsUpDown, User, Search, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { getSelectorUsers } from "@/app/actions/users"
import { useViewStore } from "@/stores/use-view-store"
import { Skeleton } from "@/components/ui/skeleton"
import { useSidebar } from "@/components/ui/sidebar"

interface UserSelectorProps {
    role: "ADMIN" | "AGENT"
}

export function UserSelector({ role }: UserSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [users, setUsers] = React.useState<{ id: string; name: string | null; email: string; image: string | null; role: string }[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isPending, startTransition] = React.useTransition()
    const router = useRouter()
    const pathname = usePathname()

    // Zustand store & Sidebar integration
    const { setSelectedUserId, clearViewContext } = useViewStore()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"

    // Fetch real users from action
    React.useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                const data = await getSelectorUsers()
                setUsers(data as any)
            } catch (err) {
                console.error("Failed to fetch selector users:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    // Match userId from path: /admin/view/[userId]/...
    const pathParts = pathname.split("/")
    const viewIndex = pathParts.indexOf("view")
    const currentUserId = viewIndex !== -1 ? pathParts[viewIndex + 1] : null

    // Sync Zustand store with current path context
    React.useEffect(() => {
        if (currentUserId) {
            setSelectedUserId(currentUserId)
        } else {
            clearViewContext()
        }
    }, [currentUserId, setSelectedUserId, clearViewContext])

    const selectedUser = users.find((u) => u.id === currentUserId)

    const handleSelect = (userId: string) => {
        setOpen(false)

        startTransition(() => {
            // If already on a view page, swap the ID
            if (viewIndex !== -1) {
                const newPathParts = [...pathParts]
                newPathParts[viewIndex + 1] = userId
                router.push(newPathParts.join("/"))
            } else {
                // Otherwise go to the root of the view portal
                const portal = role.toLowerCase()
                router.push(`/${portal}/view/${userId}`)
            }
        })
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        const portal = role.toLowerCase()
        startTransition(() => {
            router.push(`/${portal}`)
        })
    }

    return (
        <div className={cn("px-2 py-2 transition-all duration-200", isCollapsed && "px-0")}>
            {!isCollapsed && (
                <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 mb-1 tracking-wider animate-in fade-in duration-300">
                    Viewing Context
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={isPending}
                        className={cn(
                            "w-full justify-between h-12 px-2 hover:bg-accent/50 border-input/50 transition-all duration-200",
                            isPending && "opacity-70 animate-pulse",
                            isCollapsed && "h-10 w-10 p-0 mx-auto justify-center border-none hover:bg-transparent"
                        )}
                    >
                        <div className={cn("flex items-center gap-2 overflow-hidden", isCollapsed && "gap-0")}>
                            {isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                            ) : (
                                <Avatar className={cn("h-7 w-7 border shadow-sm transition-all", isCollapsed && "h-8 w-8")}>
                                    <AvatarImage src={selectedUser?.image ?? undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                        {selectedUser ? (selectedUser.name?.[0] ?? <User className="h-3 w-3" />) : <User className="h-3 w-3" />}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            {!isCollapsed && (
                                <div className="flex flex-col items-start overflow-hidden text-left animate-in fade-in slide-in-from-left-1 duration-300">
                                    <span className="text-xs font-semibold truncate w-full leading-none mb-1">
                                        {isPending ? "Switching..." : (selectedUser?.name ?? "Select User...")}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground leading-none truncate w-full">
                                        {isPending ? "Updating view context" : (selectedUser ? selectedUser.email : `Search customers to view`)}
                                    </span>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <div className="flex items-center animate-in fade-in duration-300">
                                {!isPending && selectedUser && (
                                    <div
                                        onClick={handleClear}
                                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive mr-1 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </div>
                                )}
                                {!isPending && <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />}
                            </div>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 shadow-2xl border-input/30" align="start">
                    <Command className="rounded-lg overflow-hidden">
                        <CommandInput placeholder="Search platform users..." className="h-11 border-none focus:ring-0" />
                        <CommandList className="max-h-[350px]">
                            {loading ? (
                                <div className="p-3 space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-transparent">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-3 w-24" />
                                                <Skeleton className="h-2 w-32" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <CommandEmpty className="p-4 text-center text-sm text-muted-foreground">
                                        No users matching your search.
                                    </CommandEmpty>
                                    <CommandGroup className="p-2">
                                        <div className="grid gap-2">
                                            {users.map((user) => (
                                                <CommandItem
                                                    key={user.id}
                                                    value={user.name ?? ""}
                                                    onSelect={() => handleSelect(user.id)}
                                                    className={cn(
                                                        "group flex items-center gap-3 p-2 rounded-lg border border-transparent transition-all cursor-pointer",
                                                        "hover:bg-accent hover:border-accent-foreground/10",
                                                        currentUserId === user.id ? "bg-accent/50 border-accent-foreground/5" : ""
                                                    )}
                                                >
                                                    <Avatar className="h-8 w-8 border shadow-sm transition-transform group-hover:scale-105">
                                                        <AvatarImage src={user.image ?? undefined} />
                                                        <AvatarFallback className="text-[10px] bg-muted">
                                                            {user.name?.[0] ?? <User className="h-3 w-3" />}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                                                                    {user.name ?? "Unknown User"}
                                                                </span>
                                                                {user.role === "AGENT" && (
                                                                    <div className="bg-primary/10 text-primary text-[8px] font-black px-1 rounded-sm uppercase tracking-tighter shrink-0 border border-primary/20">
                                                                        Agent
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Check
                                                                className={cn(
                                                                    "h-3 w-3 text-primary transition-opacity shrink-0",
                                                                    currentUserId === user.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground truncate">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </div>
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
