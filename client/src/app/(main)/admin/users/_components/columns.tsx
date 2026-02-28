"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Role } from "@/generated/prisma"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ExternalLink, User } from "lucide-react"
import { toast } from "sonner"
import { updateUserRole, assignAgent } from "@/app/actions/users"
import Link from "next/link"

export type UserColumn = {
    id: string
    name: string | null
    email: string
    image: string | null
    role: Role
    agentId: string | null
    _count: {
        bots: number
        positions: number
    }
}

interface ColumnProps {
    agents: { id: string; name: string | null; email: string }[]
}

export const getColumns = ({ agents }: ColumnProps): ColumnDef<UserColumn>[] => [
    {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
            const user = row.original
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={user.image ?? ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.name?.[0] ?? <User className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold leading-none mb-1">{user.name ?? "Anonymous"}</span>
                        <span className="text-xs text-muted-foreground leading-none">{user.email}</span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
            const user = row.original
            const handleRoleChange = async (newRole: Role) => {
                try {
                    await updateUserRole(user.id, newRole)
                    toast.success(`Role updated for ${user.name}`)
                } catch (error) {
                    toast.error("Failed to update role")
                }
            }

            return (
                <Select defaultValue={user.role} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-[110px] h-8 text-xs font-medium">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={Role.ADMIN}>ADMIN</SelectItem>
                        <SelectItem value={Role.AGENT}>AGENT</SelectItem>
                        <SelectItem value={Role.CUSTOMER}>CUSTOMER</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
    },
    {
        accessorKey: "agentId",
        header: "Assigned Agent",
        cell: ({ row }) => {
            const user = row.original
            if (user.role !== Role.CUSTOMER) return <span className="text-muted-foreground text-xs italic">—</span>

            const handleAgentChange = async (agentId: string) => {
                try {
                    const value = agentId === "none" ? null : agentId
                    await assignAgent(user.id, value)
                    toast.success(`Agent assigned for ${user.name}`)
                } catch (error) {
                    toast.error("Failed to assign agent")
                }
            }

            return (
                <Select defaultValue={user.agentId ?? "none"} onValueChange={handleAgentChange}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )
        },
    },
    {
        id: "stats",
        header: "Stats",
        cell: ({ row }) => {
            const { _count } = row.original
            return (
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Bots</span>
                        <span className="text-xs font-mono">{_count.bots}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Pos</span>
                        <span className="text-xs font-mono">{_count.positions}</span>
                    </div>
                </div>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original
            return (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 text-xs font-semibold">
                        <Link href={`/admin/view/${user.id}`}>
                            Select <ExternalLink className="h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            )
        },
    },
]
