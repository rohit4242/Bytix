import { getUsers, getAgents } from "@/app/actions/users"
import { UsersClient } from "./_components/users-client"

export default async function AdminUsersPage() {
    const [users, agents] = await Promise.all([
        getUsers(),
        getAgents(),
    ])

    // Explicitly map Prisma user to UserColumn type
    const data = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        agentId: u.agentId,
        _count: u._count,
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users & Agents</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage platform users, assign roles, and link customers to field agents.
                    </p>
                </div>
            </div>

            <UsersClient data={data as any} agents={agents} />
        </div>
    )
}
