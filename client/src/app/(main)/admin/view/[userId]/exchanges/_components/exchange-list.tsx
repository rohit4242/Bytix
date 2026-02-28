"use client"

import * as React from "react"
import { IconArrowsExchange } from "@tabler/icons-react"
import { ExchangeCard } from "./exchange-card"
import { PositionMode } from "@/generated/prisma"

import { type SanitizedExchange } from "@/app/actions/exchanges"

interface ExchangeListProps {
    exchanges: SanitizedExchange[]
    onEdit: (exchange: SanitizedExchange) => void
    onDelete: (id: string) => void
    onToggle: (id: string, active: boolean) => void
}

export function ExchangeList({ exchanges, onEdit, onDelete, onToggle }: ExchangeListProps) {
    if (exchanges.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
                <IconArrowsExchange className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No accounts connected yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exchanges.map((ex) => (
                <ExchangeCard
                    key={ex.id}
                    exchange={ex}
                    onToggle={onToggle}
                    onEdit={() => onEdit(ex)}
                    onDelete={() => onDelete(ex.id)}
                />
            ))}
        </div>
    )
}
