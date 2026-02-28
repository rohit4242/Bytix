/**
 * Binance Spot Trading SDK
 * 
 * Reusable functions for spot trading operations.
 * All functions use the centralized client and error handling.
 */

import { Spot, SpotRestAPI } from "@binance/spot";
import {
    BinanceResult,
    handleBinanceError,
    successResult,
    logRequest,
    logResponse,
} from "./client";

// ============================================================================
// TYPES
// ============================================================================

export interface SpotOrderParams {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    quantity?: string;
    quoteOrderQty?: string;
    price?: string;
    timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface BinanceOrderResponse {
    symbol: string;
    orderId: number;
    clientOrderId?: string;
    transactTime?: number;
    price?: string;
    origQty?: string;
    executedQty?: string;
    cummulativeQuoteQty?: string;
    status?: string;
    timeInForce?: string;
    type?: string;
    side?: string;
    fills?: Array<{
        price: string;
        qty: string;
        commission: string;
        commissionAsset: string;
    }>;
}

export interface SpotBalance {
    balances: Array<{
        asset: string;
        free: string;
        locked: string;
    }>;
}

// ============================================================================
// ORDER PLACEMENT
// ============================================================================

/**
 * Place a spot market order
 */
export async function placeSpotMarketOrder(
    client: Spot,
    params: {
        symbol: string;
        side: "BUY" | "SELL";
        quantity?: string;
        quoteOrderQty?: string;
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("placeSpotMarketOrder", params);

        // Validate parameters
        if (!params.quantity && !params.quoteOrderQty) {
            return {
                success: false,
                error: "Either quantity or quoteOrderQty is required for market orders",
            };
        }

        // Map to Binance enums
        const side: SpotRestAPI.NewOrderSideEnum =
            params.side === "BUY"
                ? SpotRestAPI.NewOrderSideEnum.BUY
                : SpotRestAPI.NewOrderSideEnum.SELL;

        const type: SpotRestAPI.NewOrderTypeEnum =
            SpotRestAPI.NewOrderTypeEnum.MARKET;

        // Build order parameters
        const orderParams: Record<string, string | SpotRestAPI.NewOrderSideEnum | SpotRestAPI.NewOrderTypeEnum> = {
            symbol: params.symbol,
            side,
            type,
        };

        if (params.quoteOrderQty) {
            orderParams.quoteOrderQty = params.quoteOrderQty;
        } else if (params.quantity) {
            orderParams.quantity = params.quantity;
        }

        // Place order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderResponse = await client.restAPI.newOrder(orderParams as any);
        const data = await orderResponse.data();

        logResponse("placeSpotMarketOrder", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Place a spot limit order
 */
export async function placeSpotLimitOrder(
    client: Spot,
    params: {
        symbol: string;
        side: "BUY" | "SELL";
        quantity: string;
        price: string;
        timeInForce?: "GTC" | "IOC" | "FOK";
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("placeSpotLimitOrder", params);

        // Map to Binance enums
        const side: SpotRestAPI.NewOrderSideEnum =
            params.side === "BUY"
                ? SpotRestAPI.NewOrderSideEnum.BUY
                : SpotRestAPI.NewOrderSideEnum.SELL;

        const type: SpotRestAPI.NewOrderTypeEnum =
            SpotRestAPI.NewOrderTypeEnum.LIMIT;

        const orderParams = {
            symbol: params.symbol,
            side,
            type,
            quantity: params.quantity,
            price: params.price,
            timeInForce: params.timeInForce || "GTC",
        };

        // Place order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderResponse = await client.restAPI.newOrder(orderParams as any);
        const data = await orderResponse.data();

        logResponse("placeSpotLimitOrder", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Close a spot position (opposite order)
 */
export async function closeSpotPosition(
    client: Spot,
    params: {
        symbol: string;
        side: "LONG" | "SHORT";
        quantity: string;
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("closeSpotPosition", params);

        // Determine opposite side
        const orderSide: SpotRestAPI.NewOrderSideEnum =
            params.side === "LONG"
                ? SpotRestAPI.NewOrderSideEnum.SELL
                : SpotRestAPI.NewOrderSideEnum.BUY;

        const type: SpotRestAPI.NewOrderTypeEnum =
            SpotRestAPI.NewOrderTypeEnum.MARKET;

        const orderParams = {
            symbol: params.symbol,
            side: orderSide,
            type,
            quantity: params.quantity,
        };

        // Place close order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderResponse = await client.restAPI.newOrder(orderParams as any);
        const data = await orderResponse.data();

        logResponse("closeSpotPosition", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// ACCOUNT QUERIES
// ============================================================================

/**
 * Get spot account balance
 */
export async function getSpotBalance(client: Spot): Promise<BinanceResult<SpotBalance>> {
    try {
        logRequest("getSpotBalance", {});

        const response = await client.restAPI.getAccount(
            {
                omitZeroBalances:
                    true
            }
        );
        const data = await response.data();

        logResponse("getSpotBalance", data);

        return successResult({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            balances: (data as any).balances || [],
        } as SpotBalance);
    } catch (error) {
        return handleBinanceError<SpotBalance>(error);
    }
}


/**
 * Get asset balance for specific asset
 */
export async function getAssetBalance(client: Spot, asset: string): Promise<BinanceResult<{ asset: string, free: string, locked: string }>> {
    try {
        const balanceResult = await getSpotBalance(client);

        if (!balanceResult.success || !balanceResult.data) {
            throw new Error("Failed to fetch spot balance");
        }

        if (!asset) {
            throw new Error("Asset is required");
        }

        const assetBalance = balanceResult.data.balances.find(
            (b) => b.asset === asset.toUpperCase()
        );

        if (!assetBalance) {
            return successResult({
                asset: asset.toUpperCase(),
                free: "0",
                locked: "0",
            });
        }

        return successResult(assetBalance);
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * Get order status
 */
export async function getOrderStatus(
    client: Spot,
    params: {
        symbol: string;
        orderId: number;
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("getOrderStatus", params);

        const response = await client.restAPI.getOrder({
            symbol: params.symbol,
            orderId: params.orderId,
        });
        const data = await response.data();

        logResponse("getOrderStatus", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
    client: Spot,
    params: {
        symbol: string;
        orderId: number;
    }
): Promise<BinanceResult<BinanceOrderResponse>> {
    try {
        logRequest("cancelOrder", params);


        const response = await client.restAPI.deleteOrder({
            symbol: params.symbol,
            orderId: params.orderId,
        });
        const data = await response.data();

        logResponse("cancelOrder", data);

        return successResult(data as BinanceOrderResponse);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get recent orders for a symbol
 */
export async function getRecentOrders(
    client: Spot,
    params: {
        symbol: string;
        limit?: number;
    }
): Promise<BinanceResult<BinanceOrderResponse[]>> {
    try {
        logRequest("getRecentOrders", params);

        const response = await client.restAPI.allOrders({
            symbol: params.symbol,
            limit: params.limit || 20,
        });
        const data = await response.data();

        logResponse("getRecentOrders", data);

        return successResult(data as BinanceOrderResponse[]);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get recent trades for a symbol
 */
export async function getRecentTrades(
    client: Spot,
    params: {
        symbol: string;
        limit?: number;
    }
): Promise<BinanceResult<any[]>> {
    try {
        logRequest("getRecentTrades", params);

        const response = await client.restAPI.myTrades({
            symbol: params.symbol,
            limit: params.limit || 20,
        });
        const data = await response.data();

        logResponse("getRecentTrades", data);

        return successResult(data as any[]);
    } catch (error) {
        return handleBinanceError(error);
    }
}
