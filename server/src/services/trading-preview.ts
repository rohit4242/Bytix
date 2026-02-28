import { Exchange } from "../generated/prisma";
import { getBinanceClient } from "../binance/client";
import { getSymbolInfo } from "../binance/market";
import { getSpotBalance } from "../binance/spot";
import { getMaxBorrowable, getMarginAccount } from "../binance/margin";

/**
 * Consolidates market and account data for a trading symbol.
 * Used to preview constraints and available balances before placing a trade.
 */
export async function getTradingPreview(exchange: Exchange, symbol: string) {
    const clients = getBinanceClient(exchange);

    // 1. Fetch Symbol Info (Constraints)
    const symbolResult = await getSymbolInfo(clients.spot, symbol);
    if (!symbolResult.success || !symbolResult.data) {
        throw new Error(symbolResult.error || `Failed to fetch info for ${symbol}`);
    }

    const symbolInfo = symbolResult.data;
    const baseAsset = symbolInfo.baseAsset;
    const quoteAsset = symbolInfo.quoteAsset; // Usually USDT

    // 2. Fetch Balances (Spot)
    let balances: any[] = [];
    let apiError: string | null = null;

    try {
        const balanceResult = await getSpotBalance(clients.spot);
        if (!balanceResult.success && !apiError) {
            apiError = balanceResult.error || "Failed to fetch spot balance";
        }
        balances = (balanceResult.success ? balanceResult.data?.balances : []) || [];
    } catch (e: any) {
        console.error("[Trading Preview] Spot balance error:", e.message);
        if (!apiError) apiError = e.message;
    }

    const quoteBalance = balances?.find(b => b.asset === quoteAsset);
    const baseBalance = balances?.find(b => b.asset === baseAsset);

    // 3. Fetch Margin Data (if allowed)
    let maxBorrowQuote = 0;
    let maxBorrowBase = 0;
    let marginAccData: any = null;
    let marginBalances: any[] = [];

    if (symbolInfo.isMarginTradingAllowed) {
        try {
            // Fetch borrowables and account info
            const [borrowQuoteResult, borrowBaseResult, marginAccResult] = await Promise.all([
                getMaxBorrowable(clients.margin, quoteAsset),
                getMaxBorrowable(clients.margin, baseAsset),
                getMarginAccount(clients.margin)
            ]);

            if (borrowQuoteResult.success) maxBorrowQuote = borrowQuoteResult.data?.amount || 0;
            else if (!apiError) apiError = borrowQuoteResult.error || `Failed to fetch ${quoteAsset} borrowable`;

            if (borrowBaseResult.success) maxBorrowBase = borrowBaseResult.data?.amount || 0;
            else if (!apiError) apiError = borrowBaseResult.error || `Failed to fetch ${baseAsset} borrowable`;

            if (marginAccResult.success && marginAccResult.data) {
                marginAccData = marginAccResult.data;
                marginBalances = marginAccResult.data.userAssets || [];
            } else if (!apiError) {
                apiError = marginAccResult.error || "Failed to fetch margin account";
            }
        } catch (e: any) {
            console.error("[Trading Preview] Margin data error:", e.message);
            if (!apiError) apiError = e.message;
        }
    }

    const marginQuote = marginBalances.find(b => b.asset === quoteAsset);
    const marginBase = marginBalances.find(b => b.asset === baseAsset);
    const otherAssets = marginBalances.filter(b =>
        b.asset !== baseAsset &&
        b.asset !== quoteAsset &&
        (Number(b.netAsset) !== 0 || Number(b.borrowed) !== 0)
    );

    // Process filters into a more usable format for the frontend
    const priceFilter = symbolInfo.filters.find(f => f.filterType === "PRICE_FILTER");
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === "LOT_SIZE");
    const minNotionalFilter = symbolInfo.filters.find(f => f.filterType === "MIN_NOTIONAL" || f.filterType === "NOTIONAL");


    return {
        symbol: symbolInfo.symbol,
        baseAsset,
        quoteAsset,
        constraints: {
            tickSize: priceFilter?.tickSize || "0.01",
            stepSize: lotSizeFilter?.stepSize || "0.00001",
            minQty: lotSizeFilter?.minQty || "0.00001",
            minNotional: minNotionalFilter?.minNotional || "5.0",
        },
        balances: {
            spot: {
                quote: {
                    asset: quoteAsset,
                    free: quoteBalance?.free || "0",
                    locked: quoteBalance?.locked || "0",
                },
                base: {
                    asset: baseAsset,
                    free: baseBalance?.free || "0",
                    locked: baseBalance?.locked || "0",
                }
            },
            margin: {
                allowed: symbolInfo.isMarginTradingAllowed,
                marginLevel: marginAccData?.marginLevel || "0",
                quote: {
                    asset: quoteAsset,
                    free: marginQuote?.free || "0",
                    locked: marginQuote?.locked || "0",
                    borrowed: marginQuote?.borrowed || "0",
                    maxBorrow: maxBorrowQuote.toString(),
                },
                base: {
                    asset: baseAsset,
                    free: marginBase?.free || "0",
                    locked: marginBase?.locked || "0",
                    borrowed: marginBase?.borrowed || "0",
                    maxBorrow: maxBorrowBase.toString(),
                },
                otherAssets: otherAssets.map(a => ({
                    asset: a.asset,
                    free: a.free
                }))
            }
        },
        apiError
    };
}
