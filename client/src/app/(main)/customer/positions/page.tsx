import * as React from "react"
import { getPositions } from "@/app/actions/positions"
import { getUserSession } from "@/lib/auth-server"
import { PositionTable } from "../../admin/view/[userId]/positions/_components/position-table"

export default async function PositionsPage() {
    const session = await getUserSession()
    if (!session?.user?.id) return null

    const userId = session.user.id
    // Fetch all positions (Open and Closed) to match the admin table's versatility
    const positions = await getPositions(userId)

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 mt-6">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Active Positions</h1>
                <p className="text-muted-foreground font-medium">Real-time market exposure and performance.</p>
            </div>

            <PositionTable 
                positions={positions} 
                isLive={false} 
                showClosedDate={false}
            />
        </div>
    )
}
