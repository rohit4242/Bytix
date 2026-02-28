/**
 * Spot Sync Service
 *
 * syncSpotAccount — fetch spot balances from Binance, calculate USD value, and update Exchange record.
 */

import { db } from "../lib/db";
import { getBinanceClient } from "../binance/client";
import { getSpotBalance } from "../binance/spot";
import { Exchange } from "../generated/prisma";
import { Decimal } from "../generated/prisma/runtime/client";

/**
 * Sync spot account balances from Binance to DB.
 * Returns the total USD value of spot assets.
 */
export async function syncSpotAccount(
    exchangeId: string,
    exchange: Exchange
): Promise<Decimal> {
    try {
        const { spot } = getBinanceClient(exchange);
        const balanceResult = await getSpotBalance(spot);

        if (!balanceResult.success || !balanceResult.data) {
            throw new Error(balanceResult.error ?? "Failed to fetch spot balance");
        }

        const balances = balanceResult.data.balances;

        // Fetch all ticker prices to calculate USD value
        const pricesResponse = await spot.restAPI.tickerPrice({});
        const pricesData = await pricesResponse.data();
        const priceMap = new Map<string, number>();

        if (Array.isArray(pricesData)) {
            pricesData.forEach((p: any) => {
                priceMap.set(p.symbol, parseFloat(p.price));
            });
        }

        let totalUsdValue = 0;

        for (const b of balances) {
            const free = parseFloat(b.free);
            const locked = parseFloat(b.locked);
            const total = free + locked;

            if (total === 0) continue;

            if (b.asset === "USDT") {
                totalUsdValue += total;
            } else if (b.asset === "BUSD" || b.asset === "USDC") {
                // Stablecoins assumed 1:1 if no direct price needed
                totalUsdValue += total;
            } else {
                const price = priceMap.get(`${b.asset}USDT`);
                if (price) {
                    totalUsdValue += total * price;
                } else {
                    // Try BTC as intermediate if USDT pair doesn't exist? 
                    // For now keeping it simple.
                }
            }
        }

        const spotUsd = new Decimal(totalUsdValue);

        // Update Exchange availableBalance (Spot USD)
        await db.exchange.update({
            where: { id: exchangeId },
            data: {
                availableBalance: spotUsd,
            },
        });

        return spotUsd;
    } catch (err) {
        console.error(`[SpotSync] Failed for exchange ${exchangeId}:`, err);
        throw err;
    }
}
