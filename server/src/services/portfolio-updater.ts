import { Decimal } from "../generated/prisma/runtime/client";
import type { PnlResult } from "./pnl-calculator";
import type { Prisma } from "../generated/prisma";
import { db } from "../lib/db";

type PrismaTx = Prisma.TransactionClient;

// ─── Portfolio Summary Sync ───────────────────────────────────────────────

/**
 * Re-calculate the entire portfolio summary based on all connected exchanges.
 * Aggregates Spot/Margin values and update the Portfolio record.
 */
export async function syncPortfolioSummary(userId: string): Promise<void> {
    const exchanges = await db.exchange.findMany({
        where: { userId },
        include: { marginAccounts: true },
    });

    let totalBalance = new Decimal(0);
    let totalAvailable = new Decimal(0);
    let totalDebt = new Decimal(0);

    for (const ex of exchanges) {
        totalBalance = totalBalance.add(ex.totalValue);
        totalAvailable = totalAvailable.add(ex.availableBalance);

        // Sum liabilities from margin accounts as debt
        for (const ma of ex.marginAccounts) {
            totalDebt = totalDebt.add(ma.totalLiabilityUsd);
        }
    }

    await db.portfolio.upsert({
        where: { userId },
        create: {
            userId,
            totalBalance,
            availableBalance: totalAvailable,
            totalDebt,
        },
        update: {
            totalBalance,
            availableBalance: totalAvailable,
            totalDebt,
        },
    });

    console.log(`[Portfolio] Summary synced for user ${userId}. Balance: ${totalBalance}`);
}
