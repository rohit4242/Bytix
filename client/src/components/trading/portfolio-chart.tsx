"use client"

import * as React from "react"
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
} from "recharts"

import { cn } from "@/lib/utils"

interface PortfolioChartProps {
    data: {
        date: string
        pnl: number
    }[]
}

export function PortfolioChart({ data }: PortfolioChartProps) {
    if (!data || data.length === 0) return null

    // Determine the main theme color based on the latest performance
    const lastPnl = data[data.length - 1]?.pnl || 0
    const isProfit = lastPnl >= 0
    const chartColor = isProfit ? "var(--primary)" : "var(--destructive)"

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="fillPnl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                        opacity={0.3}
                    />
                    <XAxis
                        dataKey="date"
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        }}
                        minTickGap={40}
                        dy={10}
                    />
                    <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value >= 0 ? "+" : ""}$${value}`}
                        width={45}
                        // Use a symmetrical domain to keep 0 in the vertical center
                        domain={([dataMin, dataMax]) => {
                            const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax), 0.1)
                            return [-absMax, absMax]
                        }}
                    />
                    <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} strokeOpacity={0.8} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const val = Number(payload[0].value)
                                return (
                                    <div className="rounded-xl border bg-background/95 p-3 shadow-2xl border-border/50 backdrop-blur-md transition-all duration-200 ring-1 ring-border/50">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full",
                                                    val >= 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                )} />
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                    Realized Performance
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-xl font-black tabular-nums tracking-tighter leading-none",
                                                val >= 0 ? "text-emerald-500" : "text-red-500"
                                            )}>
                                                {val >= 0 ? "+" : ""}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight opacity-70">
                                                {new Date(payload[0].payload.date).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                            return null
                        }}
                        cursor={{ stroke: "var(--border)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                        offset={20}
                    />
                    <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke={chartColor}
                        strokeWidth={2.5}
                        fill="url(#fillPnl)"
                        // baseValue={0} anchors the fill to the center line.
                        // Upwards for profit, downwards for loss.
                        baseValue={0}
                        animationDuration={1500}
                        dot={{
                            r: 2,
                            fill: chartColor,
                            strokeWidth: 0,
                            fillOpacity: 0.5
                        }}
                        activeDot={{
                            r: 6,
                            strokeWidth: 2.5,
                            stroke: "var(--background)",
                            fill: chartColor,
                            className: "shadow-lg"
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
