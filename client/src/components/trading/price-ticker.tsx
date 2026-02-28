"use client"

import { useEffect, useState } from "react"
import { cn, formatCurrency } from "@/lib/utils"
import { useLivePrice } from "@/hooks/use-live-price"
import { Loader2 } from "lucide-react"

interface PriceTickerProps {
    symbol?: string
    initialPrice?: number | string
    className?: string
    showSymbol?: boolean
}

export function PriceTicker({ symbol, initialPrice, className, showSymbol = false }: PriceTickerProps) {
    const { price, prevPrice, isLoading } = useLivePrice(symbol, initialPrice)
    const [flash, setFlash] = useState<"up" | "down" | null>(null)

    useEffect(() => {
        if (!isLoading && price !== prevPrice) {
            if (price > prevPrice) {
                setFlash("up")
            } else if (price < prevPrice) {
                setFlash("down")
            }

            const t = setTimeout(() => setFlash(null), 600)
            return () => clearTimeout(t)
        }
    }, [price, prevPrice, isLoading])

    if (isLoading) {
        return (
            <span className={cn("inline-flex items-center gap-1.5 opacity-50", className)}>
                {showSymbol && symbol && <span className="text-muted-foreground mr-1.5">{symbol}</span>}
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </span>
        )
    }

    return (
        <span
            className={cn(
                "font-mono font-semibold transition-colors duration-300",
                flash === "up" && "text-emerald-500",
                flash === "down" && "text-rose-500",
                !flash && "text-foreground",
                className
            )}
        >
            {showSymbol && symbol && <span className="text-muted-foreground mr-1.5">{symbol}</span>}
            {formatCurrency(price, Number(price) < 1 ? 6 : 2)}
        </span>
    )
}
