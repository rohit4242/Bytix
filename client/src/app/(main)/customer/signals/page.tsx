import { getSignals } from "@/app/actions/signals"
import { SignalsTable } from "../../admin/view/[userId]/signals/_components/signals-table"
import { getUserSession } from "@/lib/auth-server"

export default async function CustomerSignalsPage() {
    const session = await getUserSession()
    if (!session?.user?.id) return null

    const userId = session.user.id
    const signals = await getSignals(userId)

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 mt-6">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Signal Pulse</h1>
                <p className="text-muted-foreground font-medium">Real-time bot execution logs and webhook alerts.</p>
            </div>

            <SignalsTable data={signals} />
        </div>
    )
}
