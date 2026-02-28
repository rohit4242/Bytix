/**
 * Binance Margin Trading SDK
 * 
 * Reusable functions for margin trading operations.
 * Includes borrow/repay and margin-specific order placement.
 */

import { MarginTrading } from "@binance/margin-trading";
import {
    BinanceResult,
    handleBinanceError,
    successResult,
    logRequest,
    logResponse,
} from "./client";
import { BinanceOrderResponse } from "./spot";

// ============================================================================
// TYPES
// ============================================================================

export interface MarginOrderParams {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    quantity?: string;
    quoteOrderQty?: string;
    price?: string;
    timeInForce?: "GTC" | "IOC" | "FOK";
    sideEffectType?: "NO_SIDE_EFFECT" | "MARGIN_BUY" | "AUTO_REPAY" | "AUTO_BORROW_REPAY";
}

export interface MarginAccountInfo {
    totalAssetOfBtc: string;
    totalLiabilityOfBtc: string;
    totalNetAssetOfBtc: string;
    marginLevel: string;
    tradeEnabled: boolean;
    transferEnabled: boolean;
    borrowEnabled: boolean;
    userAssets: Array<{
        asset: string;
        free: string;
        locked: string;
        borrowed: string;
        interest: string;
        netAsset: string;
    }>;
}

// ============================================================================
// ORDER PLACEMENT
// ============================================================================

/**
 * Place a margin market order
 */
export async function placeMarginMarketOrder(
    client: MarginTrading,
    params: {
        symbol: string;
        side: "BUY" | "SELL";
        quantity?: string;
        quoteOrderQty?: string;
        sideEffectType?: "NO_SIDE_EFFECT" | "MARGIN_BUY" | "AUTO_REPAY" | "AUTO_BORROW_REPAY";
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("placeMarginMarketOrder", params);

        // Validate parameters
        if (!params.quantity && !params.quoteOrderQty) {
            return {
                success: false,
                error: "Either quantity or quoteOrderQty is required",
            };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderParams: any = {
            symbol: params.symbol,
            side: params.side,
            type: "MARKET",
        };

        if (params.quantity) {
            orderParams.quantity = parseFloat(params.quantity);
        }

        if (params.quoteOrderQty) {
            orderParams.quoteOrderQty = parseFloat(params.quoteOrderQty);
        }

        if (params.sideEffectType) {
            orderParams.sideEffectType = params.sideEffectType;
        }

        // Place order
        const response = await client.restAPI.marginAccountNewOrder(orderParams);
        const data = await response.data();

        logResponse("placeMarginMarketOrder", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        console.error("Error placing margin market order:", error);
        return handleBinanceError(error);
    }
}

/**
 * Place a margin limit order
 */
export async function placeMarginLimitOrder(
    client: MarginTrading,
    params: {
        symbol: string;
        side: "BUY" | "SELL";
        quantity: string;
        price: string;
        timeInForce?: "GTC" | "IOC" | "FOK";
        sideEffectType?: "NO_SIDE_EFFECT" | "MARGIN_BUY" | "AUTO_REPAY" | "AUTO_BORROW_REPAY";
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("placeMarginLimitOrder", params);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderParams: any = {
            symbol: params.symbol,
            side: params.side,
            type: "LIMIT",
            quantity: parseFloat(params.quantity),
            price: parseFloat(params.price),
            timeInForce: params.timeInForce || "GTC",
        };

        if (params.sideEffectType) {
            orderParams.sideEffectType = params.sideEffectType;
        }

        // Place order
        const response = await client.restAPI.marginAccountNewOrder(orderParams);
        const data = await response.data();

        logResponse("placeMarginLimitOrder", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Close a margin position (opposite order)
 */
export async function closeMarginPosition(
    client: MarginTrading,
    params: {
        symbol: string;
        side: "LONG" | "SHORT";
        quantity: string;
        sideEffectType?: "NO_SIDE_EFFECT" | "AUTO_REPAY";
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("closeMarginPosition", params);

        // Determine opposite side
        const orderSide = params.side === "LONG" ? "SELL" : "BUY";

        // Place market order to close
        return await placeMarginMarketOrder(client, {
            symbol: params.symbol,
            side: orderSide,
            quantity: params.quantity,
            sideEffectType: params.sideEffectType || "NO_SIDE_EFFECT",
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// MARGIN ACCOUNT
// ============================================================================

/**
 * Get margin account information
 */
export async function getMarginAccount(
    client: MarginTrading
): Promise<BinanceResult<MarginAccountInfo>> {
    try {
        logRequest("getMarginAccount", {});

        const response = await client.restAPI.queryCrossMarginAccountDetails(
        );
        const data = await response.data();

        logResponse("getMarginAccount", data);

        return successResult({
            totalAssetOfBtc: data.totalAssetOfBtc || "0",
            totalLiabilityOfBtc: data.totalLiabilityOfBtc || "0",
            totalNetAssetOfBtc: data.totalNetAssetOfBtc || "0",
            marginLevel: data.marginLevel || "0",
            tradeEnabled: data.tradeEnabled || false,
            transferEnabled: data.transferInEnabled || false,
            borrowEnabled: data.borrowEnabled || false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userAssets: (data.userAssets || []).map((asset: any) => ({
                asset: asset.asset,
                free: asset.free,
                locked: asset.locked,
                borrowed: asset.borrowed,
                interest: asset.interest,
                netAsset: asset.netAsset,
            })),
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get maximum borrowable amount for an asset
 */
export async function getMaxBorrowable(
    client: MarginTrading,
    asset: string
): Promise<BinanceResult<{ amount: number; asset: string }>> {
    try {
        logRequest("getMaxBorrowable", { asset });

        const response = await client.restAPI.queryMaxBorrow({
            asset,
            isolatedSymbol: undefined,
        });
        const data = await response.data();

        logResponse("getMaxBorrowable", data);

        return successResult({
            amount: parseFloat(data.amount || "0"),
            asset: asset,
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// BORROW / REPAY
// ============================================================================

/**
 * Borrow asset on margin
 */
export async function borrowMargin(
    client: MarginTrading,
    params: {
        asset: string;
        amount: string;
    }
): Promise<BinanceResult<{ tranId: number | bigint }>> {
    try {
        logRequest("borrowMargin", params);

        const response = await client.restAPI.marginAccountBorrowRepay({
            asset: params.asset,
            amount: params.amount,
            isIsolated: 'FALSE',
            symbol: params.asset, // Empty string for cross-margin (allows auto-conversion)
            type: 'BORROW',
        });
        const data = await response.data();

        logResponse("borrowMargin", data);


        return successResult({
            tranId: data.tranId || 0,
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Repay borrowed asset
 */
export async function repayMargin(
    client: MarginTrading,
    params: {
        asset: string;
        amount: string;
    }
): Promise<BinanceResult<{ tranId: number | bigint }>> {
    try {
        logRequest("repayMargin", params);

        const response = await client.restAPI.marginAccountBorrowRepay({
            asset: params.asset,
            amount: params.amount,
            isIsolated: 'FALSE',
            symbol: params.asset, // Empty string for cross-margin (enables cross-asset repayment)
            type: 'REPAY',
        });
        const data = await response.data();

        logResponse("repayMargin", data);

        return successResult({
            tranId: data.tranId || 0,
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get recent margin orders for a symbol
 */
export async function getRecentMarginOrders(
    client: MarginTrading,
    params: {
        symbol: string;
        limit?: number;
    }
): Promise<BinanceResult<BinanceOrderResponse[]>> {
    try {
        logRequest("getRecentMarginOrders", params);

        const response = await client.restAPI.queryMarginAccountsAllOrders({
            symbol: params.symbol,
            limit: params.limit || 20,
        });
        const data = await response.data();

        logResponse("getRecentMarginOrders", data);

        return successResult(data as BinanceOrderResponse[]);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get recent margin trades for a symbol
 */
export async function getRecentMarginTrades(
    client: MarginTrading,
    params: {
        symbol: string;
        limit?: number;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<BinanceResult<any[]>> {
    try {
        logRequest("getRecentMarginTrades", params);

        const response = await client.restAPI.queryMarginAccountsTradeList({
            symbol: params.symbol,
            limit: params.limit || 20,
        });
        const data = await response.data();

        logResponse("getRecentMarginTrades", data);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return successResult(data as any[]);
    } catch (error) {
        return handleBinanceError(error);
    }
}

export async function createMarginListenKey(client: MarginTrading): Promise<BinanceResult<{ listenKey: string }>> {
    try {
        const response = await client.restAPI.startUserDataStream();
        const data = await response.data();
        logResponse("createMarginListenKey", { success: true });
        return successResult(data as { listenKey: string });
    } catch (error) {
        return handleBinanceError(error);
    }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function keepAliveMarginListenKey(client: MarginTrading, listenKey: string): Promise<BinanceResult<any>> {
    try {
        const response = await client.restAPI.keepaliveUserDataStream({
            listenKey: listenKey
        });
        const data = await response.data();
        logResponse("keepAliveMarginListenKey", { success: true });
        return successResult(data);
    } catch (error) {
        return handleBinanceError(error);
    }
}

// Get margin order status
export async function getMarginOrderStatus(
    client: MarginTrading,
    params: {
        symbol: string;
        orderId: number;
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("getMarginOrderStatus", params);

        const response = await client.restAPI.queryMarginAccountsOrder({
            symbol: params.symbol,
            orderId: params.orderId,
        });
        const data = await response.data();

        logResponse("getMarginOrderStatus", data);

        return successResult(data as any as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}
