import * as React from "react"
import { IconActivity, IconPackage, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortfolio, getSnapshots } from "@/app/actions/portfolio"
import { getUserSession } from "@/lib/auth-server"
import { PortfolioChart } from "@/components/trading/portfolio-chart"
import { cn, formatCurrency } from "@/lib/utils"

export default async function CustomerDashboard() {
    const session = await getUserSession()
    if (!session?.user?.id) return null

    const userId = session.user.id
    const [portfolio, snapshots] = await Promise.all([
        getPortfolio(userId),
        getSnapshots(userId)
    ])

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 mt-6">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Dashboard</h1>
                <p className="text-muted-foreground font-medium">Welcome back to your Bytix portal.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20 shadow-sm transition-all hover:shadow-md hover:bg-primary/10 group cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Total Portfolio</CardTitle>
                        <IconTrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">{formatCurrency(portfolio.balance)}</div>
                        <p className={cn(
                            "text-xs font-bold mt-1",
                            portfolio.pnlPercent >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                            {portfolio.pnlPercent >= 0 ? "+" : ""}{portfolio.pnlPercent}% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm transition-all hover:shadow-md hover:bg-muted/50 cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Positions</CardTitle>
                        <IconActivity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">{portfolio.openPositions}</div>
                        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                            Current open trades
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm transition-all hover:shadow-md hover:bg-muted/50 cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</CardTitle>
                        <IconPackage className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">{portfolio.totalTrades}</div>
                        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                            Orders pending fulfillment
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm transition-all hover:shadow-md hover:bg-muted/50 cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Win Rate</CardTitle>
                        <IconActivity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black italic">{portfolio.winRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-tighter">
                            Optimized trading score
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm h-[400px]">
                    <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-tight">Portfolio Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PortfolioChart data={snapshots} />
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-sm border-dashed">
                    <CardHeader>
                        <CardTitle className="text-lg font-black uppercase italic tracking-tight">Recent Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <div className="space-y-1 flex-1">
                                    <p className="text-xs font-black uppercase italic">Market Movement</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">BTC has increased by 2.4% in the last hour.</p>
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors">2m ago</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
