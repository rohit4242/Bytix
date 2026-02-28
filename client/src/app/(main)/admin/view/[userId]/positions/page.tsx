import { PositionsTab } from "./_components/positions-tab"
import { getPositions } from "@/app/actions/positions"

export default async function AdminPositionsPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params
    const initialPositions = await getPositions(userId)

    return (
        <PositionsTab userId={userId} initialPositions={initialPositions as any} />
    )
}
