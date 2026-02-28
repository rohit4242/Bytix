import { notFound } from "next/navigation"
import db from "@/lib/db"
import { ViewNav } from "./_components/view-nav"

export default async function ViewLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params

    const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true },
    })

    if (!targetUser) {
        notFound()
        
    }

    return (
        <div className="flex flex-col gap-6">

            <div className="flex flex-col gap-6">
                <ViewNav userId={userId} />
                {children}
            </div>
        </div>
    )
}
