/**
 * Margin Sync Service
 *
 * syncMarginAccount — fetch from Binance, upsert MarginAccount + BorrowedAsset records
 *
 * Per doc 07. Only CROSS margin is supported.
 */

import { db } from "../lib/db";
import { getBinanceClient } from "../binance/client";
import { getMarginAccount } from "../binance/margin";
import { classifyRisk } from "../binance/utils";
import type { Exchange } from "../generated/prisma";
import { Decimal } from "../generated/prisma/runtime/client";

/**
 * Sync cross margin account from Binance, upsert MarginAccount record,
 * and return total Net Asset USD (equity).
 */
export async function syncMarginAccount(
    exchangeId: string,
    exchange: Exchange
): Promise<Decimal> {
    try {
        const { margin, spot } = getBinanceClient(exchange);

        const result = await getMarginAccount(margin);
        if (!result.success || !result.data) {
            throw new Error(result.error ?? "Failed to fetch margin account info");
        }

        const accountInfo = result.data;

        // Fetch all ticker prices to calculate USD equivalent values
        const pricesResponse = await spot.restAPI.tickerPrice({});
        const pricesData = await pricesResponse.data();
        const priceMap = new Map<string, number>();

        if (Array.isArray(pricesData)) {
            for (const p of pricesData as Array<{ symbol: string; price: string }>) {
                priceMap.set(p.symbol, parseFloat(p.price));
            }
        }

        // ─── Compute net asset USD ────────────────────────────────────────

        let totalNetUsdValue = 0;
        let totalLiabilityUsd = 0;

        for (const asset of accountInfo.userAssets) {
            const netAsset = parseFloat(asset.netAsset || "0");
            const borrowed = parseFloat(asset.borrowed || "0");
            const interest = parseFloat(asset.interest || "0");

            if (asset.asset === "USDT" || asset.asset === "BUSD" || asset.asset === "USDC") {
                totalNetUsdValue += netAsset;
                totalLiabilityUsd += borrowed + interest;
            } else {
                const price = priceMap.get(`${asset.asset}USDT`);
                if (price) {
                    if (netAsset !== 0) totalNetUsdValue += netAsset * price;
                    totalLiabilityUsd += (borrowed + interest) * price;
                } else {
                    // Failover via BTC
                    const btcPrice = priceMap.get(`${asset.asset}BTC`);
                    const btcUsdtPrice = priceMap.get("BTCUSDT");
                    if (btcPrice && btcUsdtPrice) {
                        if (netAsset !== 0) totalNetUsdValue += netAsset * btcPrice * btcUsdtPrice;
                        totalLiabilityUsd += (borrowed + interest) * btcPrice * btcUsdtPrice;
                    }
                }
            }
        }

        const totalAssetUsd = totalNetUsdValue + totalLiabilityUsd;
        const marginLevelRaw = parseFloat(accountInfo.marginLevel ?? "0");
        const marginLevelDecimal = marginLevelRaw > 0 ? new Decimal(marginLevelRaw.toFixed(4)) : null;
        const riskLevel = classifyRisk(marginLevelRaw > 0 ? marginLevelRaw : null);

        // ─── Upsert MarginAccount record ──────────────────────────────────

        const marginAccount = await db.marginAccount.upsert({
            where: { exchangeId_marginType: { exchangeId, marginType: "CROSS" } },
            create: {
                exchangeId,
                marginType: "CROSS",
                marginLevel: marginLevelDecimal,
                riskLevel,
                totalAssetUsd: new Decimal(totalAssetUsd.toFixed(8)),
                totalLiabilityUsd: new Decimal(totalLiabilityUsd.toFixed(8)),
                netAssetUsd: new Decimal(totalNetUsdValue.toFixed(8)),
                lastSyncAt: new Date(),
            },
            update: {
                marginLevel: marginLevelDecimal,
                riskLevel,
                totalAssetUsd: new Decimal(totalAssetUsd.toFixed(8)),
                totalLiabilityUsd: new Decimal(totalLiabilityUsd.toFixed(8)),
                netAssetUsd: new Decimal(totalNetUsdValue.toFixed(8)),
                lastSyncAt: new Date(),
            },
        });

        // ─── Upsert BorrowedAsset records ─────────────────────────────────

        for (const asset of accountInfo.userAssets) {
            const borrowed = parseFloat(asset.borrowed || "0");
            const interest = parseFloat(asset.interest || "0");
            if (borrowed === 0 && interest === 0) continue;

            await db.borrowedAsset.upsert({
                where: {
                    marginAccountId_asset: {
                        marginAccountId: marginAccount.id,
                        asset: asset.asset,
                    },
                },
                create: {
                    marginAccountId: marginAccount.id,
                    asset: asset.asset,
                    borrowed: new Decimal(borrowed.toFixed(8)),
                    interest: new Decimal(interest.toFixed(8)),
                    free: new Decimal(parseFloat(asset.free || "0").toFixed(8)),
                    locked: new Decimal(parseFloat(asset.locked || "0").toFixed(8)),
                    netAsset: new Decimal(parseFloat(asset.netAsset || "0").toFixed(8)),
                },
                update: {
                    borrowed: new Decimal(borrowed.toFixed(8)),
                    interest: new Decimal(interest.toFixed(8)),
                    free: new Decimal(parseFloat(asset.free || "0").toFixed(8)),
                    locked: new Decimal(parseFloat(asset.locked || "0").toFixed(8)),
                    netAsset: new Decimal(parseFloat(asset.netAsset || "0").toFixed(8)),
                },
            });
        }

        return new Decimal(totalNetUsdValue.toFixed(8));
    } catch (err) {
        console.error(`[MarginSync] Failed for exchange ${exchangeId}:`, err);
        throw err;
    }
}
