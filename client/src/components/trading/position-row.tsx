"use client"

import { useState } from "react"
import { cn, formatCurrency, formatDateTime, formatPnl, pnlColor } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PositionSummary } from "@/types"

interface PositionRowProps {
    position: PositionSummary
    onClose?: (id: string) => void
    isClosing?: boolean
    showBot?: boolean
}

const sideColor = {
    LONG: "bg-green-500/10 text-green-400 border-green-500/20",
    SHORT: "bg-red-500/10 text-red-400 border-red-500/20",
}

export function PositionRow({
    position,
    onClose,
    isClosing,
    showBot = true,
}: PositionRowProps) {
    return (
        <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
            {/* Symbol + Bot */}
            <td className="py-3 pl-4 pr-3">
                <div className="font-mono font-semibold text-sm">{position.symbol}</div>
                {showBot && position.bot && (
                    <div className="text-xs text-muted-foreground">{position.bot.name}</div>
                )}
            </td>

            {/* Side */}
            <td className="px-3 py-3">
                <span
                    className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        sideColor[position.side as keyof typeof sideColor]
                    )}
                >
                    {position.side}
                </span>
            </td>

            {/* Entry Price */}
            <td className="px-3 py-3 font-mono text-sm text-right">
                {position.entryPrice ? formatCurrency(position.entryPrice, 4) : "—"}
            </td>

            {/* Quantity */}
            <td className="px-3 py-3 font-mono text-sm text-right">
                {Number(position.quantity).toFixed(4)}
            </td>

            {/* P&L */}
            <td className={cn("px-3 py-3 font-mono text-sm text-right font-semibold", pnlColor(position.unrealizedPnl))}>
                {formatPnl(position.unrealizedPnl)}
            </td>

            {/* Status / Opened */}
            <td className="px-3 py-3 text-xs text-muted-foreground text-right">
                {formatDateTime(position.openedAt)}
            </td>

            {/* Close button */}
            <td className="py-3 pl-3 pr-4 text-right">
                {onClose && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isClosing}>
                                {isClosing ? "Closing…" : "Close"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Close Position?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will close your <strong>{position.symbol} {position.side}</strong> position
                                    at market price. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onClose(position.id)}>
                                    Close Position
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </td>
        </tr>
    )
}
