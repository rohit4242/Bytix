/**
 * Binance Market Data SDK
 * 
 * Reusable functions for fetching market information.
 * Price queries, symbol info, exchange info, etc.
 */

import { Spot } from "@binance/spot";
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

export interface SymbolPrice {
    symbol: string;
    price: string;
}

export interface Ticker24h {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    weightedAvgPrice: string;
    prevClosePrice: string;
    lastPrice: string;
    lastQty: string;
    bidPrice: string;
    askPrice: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openTime: number;
    closeTime: number;
    count: number; // Number of trades
}

export interface SymbolFilter {
    filterType: string;
    minPrice?: string;
    maxPrice?: string;
    tickSize?: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
    minNotional?: string;
}

export interface SymbolInfo {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetPrecision: number;
    quoteAssetPrecision: number;
    filters: SymbolFilter[];
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
}

// ============================================================================
// PRICE QUERIES
// ============================================================================

/**
 * Get current price for a symbol
 */
export async function getSymbolPrice(
    client: Spot,
    symbol: string
): Promise<BinanceResult<SymbolPrice>> {
    try {
        logRequest("getSymbolPrice", { symbol });

        const response = await client.restAPI.tickerPrice({ symbol });
        const data = await response.data();

        logResponse("getSymbolPrice", data);

        return successResult(data as SymbolPrice);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get 24-hour ticker statistics
 */
export async function getTicker24h(
    client: Spot,
    symbol: string
): Promise<BinanceResult<Ticker24h>> {
    try {
        logRequest("getTicker24h", { symbol });

        const response = await client.restAPI.ticker24hr({ symbol });
        const data = await response.data();

        logResponse("getTicker24h", data);

        return successResult(data as Ticker24h);
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// SYMBOL INFORMATION
// ============================================================================

/**
 * Get detailed symbol information
 */
export async function getSymbolInfo(
    client: Spot,
    symbol: string
): Promise<BinanceResult<SymbolInfo>> {
    try {
        logRequest("getSymbolInfo", { symbol });

        const response = await client.restAPI.exchangeInfo({ symbol });
        const data = await response.data();

        if (!data.symbols || data.symbols.length === 0) {
            return {
                success: false,
                error: `Symbol ${symbol} not found`,
            };
        }

        const symbolInfo = data.symbols[0];

        logResponse("getSymbolInfo", symbolInfo);

        return successResult(symbolInfo as SymbolInfo);
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Get all exchange symbols
 */
export async function getExchangeInfo(
    client: Spot
): Promise<BinanceResult<{ symbols: SymbolInfo[] }>> {
    try {
        logRequest("getExchangeInfo", {});

        const response = await client.restAPI.exchangeInfo({});
        const data = await response.data();

        logResponse("getExchangeInfo", { symbolCount: data.symbols?.length || 0 });

        return successResult({
            symbols: (data.symbols || []) as SymbolInfo[],
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get price filter for a symbol
 */
export function getPriceFilter(symbolInfo: SymbolInfo): SymbolFilter | null {
    return symbolInfo.filters.find((f) => f.filterType === "PRICE_FILTER") || null;
}

/**
 * Get lot size filter for a symbol
 */
export function getLotSizeFilter(symbolInfo: SymbolInfo): SymbolFilter | null {
    return symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE") || null;
}

/**
 * Get min notional filter for a symbol
 */
export function getMinNotionalFilter(symbolInfo: SymbolInfo): SymbolFilter | null {
    return symbolInfo.filters.find((f) => f.filterType === "MIN_NOTIONAL" || f.filterType === "NOTIONAL") || null;
}

/**
 * Format price according to symbol tick size
 */
export function formatPrice(price: number, symbolInfo: SymbolInfo): string {
    const priceFilter = getPriceFilter(symbolInfo);
    if (!priceFilter || !priceFilter.tickSize) {
        return price.toFixed(8); // Default precision
    }

    const tickSize = parseFloat(priceFilter.tickSize);
    const precision = Math.abs(Math.log10(tickSize));
    return price.toFixed(Math.floor(precision));
}

/**
 * Format quantity according to symbol step size
 */
export function formatQuantity(quantity: number, symbolInfo: SymbolInfo): string {
    const lotSizeFilter = getLotSizeFilter(symbolInfo);
    if (!lotSizeFilter || !lotSizeFilter.stepSize) {
        return quantity.toFixed(8); // Default precision
    }

    const stepSize = parseFloat(lotSizeFilter.stepSize);
    const precision = stepSize < 1 ? Math.max(0, Math.round(-Math.log10(stepSize))) : 0;

    // Floor to nearest step size — CRITICAL to avoid "Insufficient Balance" errors 
    // when balance is slightly lower than position.quantity due to fees.
    const floored = Math.floor(quantity / stepSize) * stepSize;

    return floored.toFixed(precision);
}

/**
 * Validate if order meets minimum notional
 */
export function validateMinNotional(
    price: number,
    quantity: number,
    symbolInfo: SymbolInfo
): { valid: boolean; minNotional?: number; currentValue: number } {
    const minNotionalFilter = getMinNotionalFilter(symbolInfo);
    const currentValue = price * quantity;

    if (!minNotionalFilter || !minNotionalFilter.minNotional) {
        return { valid: true, currentValue };
    }

    const minNotional = parseFloat(minNotionalFilter.minNotional);
    return {
        valid: currentValue >= minNotional,
        minNotional,
        currentValue,
    };
}
