"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { getSignals, deleteSignal, deleteAllSignals } from "@/app/actions/signals"
import { SignalsTable } from "./signals-table"
import { cn } from "@/lib/utils"

interface SignalsTabProps {
    userId: string
    initialSignals: any[]
}

export function SignalsTab({ userId, initialSignals }: SignalsTabProps) {
    const [signals, setSignals] = useState<any[]>(initialSignals)
    const [isRefreshing, setIsRefreshing] = useState(false)

    async function handleRefresh() {
        setIsRefreshing(true)
        const refreshPromise = (async () => {
            try {
                const freshSignals = await getSignals(userId)
                setSignals(freshSignals)
                return "Signal pulse updated"
            } catch (err) {
                throw new Error("Failed to refresh signals")
            }
        })()

        toast.promise(refreshPromise, {
            loading: "Updating signal pulse...",
            success: (msg) => msg,
            error: (err) => err.message,
            finally: () => setIsRefreshing(false),
        })
    }

    async function handleDelete(id: string) {
        try {
            await deleteSignal(id)
            setSignals((prev) => prev.filter((s) => s.id !== id))
            toast.success("Signal deleted")
        } catch (err) {
            toast.error("Failed to delete signal")
        }
    }

    async function handleDeleteAll() {
        try {
            await deleteAllSignals(userId)
            setSignals([])
            toast.success("Signal history purged")
        } catch (err) {
            toast.error("Failed to purge signal history")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">
                        Global Signal Pulse
                    </h1>
                    <p className="mt-1 text-sm tracking-wide text-muted-foreground uppercase">
                        Complete history of incoming alerts for all user bots.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2 bg-card"
                    >
                        <RefreshCw
                            className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            <SignalsTable
                data={signals}
                onDelete={handleDelete}
                onDeleteAll={handleDeleteAll}
            />
        </div>
    )
}
