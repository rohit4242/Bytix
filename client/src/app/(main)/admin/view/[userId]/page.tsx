import { getPortfolio, getSnapshots } from "@/app/actions/portfolio"
import { getSignals } from "@/app/actions/signals"
import { PnlBadge } from "@/components/trading/pnl-badge"
import { PortfolioChart } from "@/components/trading/portfolio-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, Zap, Activity } from "lucide-react"
import { RecentActivity } from "./_components/recent-activity"
import { cn } from "@/lib/utils"

export default async function UserOverviewPage({
    params,
}: {
    params: Promise<{ userId: string }>
}) {
    const { userId } = await params

    const [portfolio, snapshots, signals] = await Promise.all([
        getPortfolio(userId),
        getSnapshots(userId),
        getSignals(userId),
    ])

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Total Equity
                        </CardTitle>
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">${portfolio.balance.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Available: <span className="font-bold text-foreground">${portfolio.available.toLocaleString()}</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Realized P&L
                        </CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black">
                                <PnlBadge value={portfolio.totalPnl} size="lg" />
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            All-time profit: <span className={cn(
                                "font-bold",
                                portfolio.pnlPercent >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                                {portfolio.pnlPercent >= 0 ? "+" : ""}{portfolio.pnlPercent}%
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Win Rate
                        </CardTitle>
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black">{portfolio.winRate}%</div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Across <span className="font-bold text-foreground">{portfolio.totalTrades}</span> total trades
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Active Context
                        </CardTitle>
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Bots</span>
                                <span className="text-lg font-black leading-none">{portfolio.activeBots}</span>
                            </div>
                            <div className="h-8 w-px bg-border/50" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Open</span>
                                <span className="text-lg font-black leading-none">{portfolio.openPositions}</span>
                            </div>
                            <div className="ml-auto">
                                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-2 py-1 rounded-full border border-emerald-500/20">
                                    ✓ Safe
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <Card className="lg:col-span-6 shadow-sm border-border/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-6">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-black tracking-tight">
                                Performance Analytics
                            </CardTitle>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Cumulative realized profit & loss (USDT)
                            </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-2 py-1">
                            <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                                Last 30 Days
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[320px] w-full pt-0">
                        <PortfolioChart data={snapshots} />
                    </CardContent>
                </Card>

                <div className="lg:col-span-4">
                    <RecentActivity signals={signals.slice(0, 5)} />
                </div>
            </div>
        </div>
    )
}
