import { getSignals } from "@/app/actions/signals"
import { SignalsTab } from "./_components/signals-tab"

export default async function AdminSignalsPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params
    const signals = await getSignals(userId)

    return <SignalsTab userId={userId} initialSignals={signals} />
}
