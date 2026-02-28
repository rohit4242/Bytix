import { getExchanges } from "@/app/actions/exchanges"
import { ExchangeClient } from "./_components/exchange-client"

export default async function UserExchangesPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params

    const initialExchanges = await getExchanges(userId)

    return (
        <ExchangeClient
            userId={userId}
            initialExchanges={initialExchanges}
        />
    )
}
