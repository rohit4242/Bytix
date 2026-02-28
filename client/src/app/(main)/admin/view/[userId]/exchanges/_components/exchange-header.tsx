"use client"

import * as React from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface ExchangeHeaderProps {
    onAdd: () => void
}

export function ExchangeHeader({ onAdd }: ExchangeHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Exchanges</h1>
                <p className="text-muted-foreground">Manage API keys and account configurations.</p>
            </div>
            <Button onClick={onAdd}>
                <IconPlus className="mr-2 h-4 w-4" />
                New Account
            </Button>
        </div>
    )
}
