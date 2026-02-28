import { getBots } from "@/app/actions/bots"
import { getExchanges } from "@/app/actions/exchanges"
import { BotClient } from "./_components/bot-client"

export default async function AdminBotsPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params

    // Parallel fetch for speed
    const [bots, exchanges] = await Promise.all([
        getBots(userId),
        getExchanges(userId)
    ])

    const filteredBots = bots.filter((bot): bot is NonNullable<typeof bot> => bot !== null)

    return (
        <BotClient
            userId={userId}
            initialBots={filteredBots}
            exchanges={exchanges}
        />
    )
}
