/**
 * Binance Utility Functions
 *
 * Helper functions for common Binance operations.
 *
 * ADDED: mapBinanceStatus — maps Binance order status strings to our OrderStatus enum.
 * ADDED: calculateProtectivePrices — computes SL/TP prices and the close-side from entry price.
 */

import { OrderStatus } from "../generated/prisma";

// ============================================================================
// STATUS MAPPING (new)
// ============================================================================

const BINANCE_STATUS_MAP: Record<string, OrderStatus> = {
    NEW: OrderStatus.OPEN,
    PARTIALLY_FILLED: OrderStatus.PARTIALLY_FILLED,
    FILLED: OrderStatus.FILLED,
    CANCELED: OrderStatus.CANCELED,
    PENDING_CANCEL: OrderStatus.CANCELED,
    REJECTED: OrderStatus.REJECTED,
    EXPIRED: OrderStatus.EXPIRED,
    EXPIRED_IN_MATCH: OrderStatus.EXPIRED,
};

/**
 * Maps a Binance order status string to our internal OrderStatus enum.
 * Falls back to PENDING for unknown statuses.
 */
export function mapBinanceStatus(binanceStatus: string): OrderStatus {
    return BINANCE_STATUS_MAP[binanceStatus] ?? OrderStatus.PENDING;
}

// ============================================================================
// PROTECTIVE PRICE CALCULATOR (new)
// ============================================================================

export interface ProtectivePrices {
    stopLoss: number;
    takeProfit: number;
    closeSide: "BUY" | "SELL";
}

/**
 * Calculate stop-loss and take-profit prices from entry price and percentages.
 *
 * LONG:  SL = entry * (1 - sl%), TP = entry * (1 + tp%), closeSide = SELL
 * SHORT: SL = entry * (1 + sl%), TP = entry * (1 - tp%), closeSide = BUY
 */
export function calculateProtectivePrices(
    side: "LONG" | "SHORT",
    entryPrice: number,
    slPercent: number,
    tpPercent: number
): ProtectivePrices {
    if (side === "LONG") {
        return {
            stopLoss: entryPrice * (1 - slPercent / 100),
            takeProfit: entryPrice * (1 + tpPercent / 100),
            closeSide: "SELL",
        };
    } else {
        return {
            stopLoss: entryPrice * (1 + slPercent / 100),
            takeProfit: entryPrice * (1 - tpPercent / 100),
            closeSide: "BUY",
        };
    }
}

// ============================================================================
// PRICE CALCULATIONS (original)
// ============================================================================

/**
 * Calculate stop loss price based on entry price and percentage
 */
export function calculateStopLossPrice(
    entryPrice: number,
    slPercent: number,
    side: "LONG" | "SHORT"
): number {
    if (side === "LONG") {
        // For long positions, SL is below entry
        return entryPrice * (1 - slPercent / 100);
    } else {
        // For short positions, SL is above entry
        return entryPrice * (1 + slPercent / 100);
    }
}

/**
 * Calculate take profit price based on entry price and percentage
 */
export function calculateTakeProfitPrice(
    entryPrice: number,
    tpPercent: number,
    side: "LONG" | "SHORT"
): number {
    if (side === "LONG") {
        // For long positions, TP is above entry
        return entryPrice * (1 + tpPercent / 100);
    } else {
        // For short positions, TP is below entry
        return entryPrice * (1 - tpPercent / 100);
    }
}

/**
 * Calculate PnL for a trade
 */
export function calculatePnL(
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    side: "LONG" | "SHORT"
): number {
    if (side === "LONG") {
        return (exitPrice - entryPrice) * quantity;
    } else {
        return (entryPrice - exitPrice) * quantity;
    }
}

/**
 * Calculate PnL percentage
 */
export function calculatePnLPercent(
    entryPrice: number,
    exitPrice: number,
    side: "LONG" | "SHORT"
): number {
    if (side === "LONG") {
        return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
        return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
}

// ============================================================================
// FORMATTING (original)
// ============================================================================

/**
 * Format price with proper precision
 */
export function formatPrice(price: number, decimals: number = 8): string {
    return price.toFixed(decimals);
}

/**
 * Format quantity with proper precision
 */
export function formatQuantity(quantity: number, decimals: number = 8): string {
    return quantity.toFixed(decimals);
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

// ============================================================================
// VALIDATION (original)
// ============================================================================

/**
 * Validate if price meets minimum notional
 */
export function meetsMinNotional(
    price: number,
    quantity: number,
    minNotional: number
): boolean {
    return price * quantity >= minNotional;
}

/**
 * Validate if quantity is within limits
 */
export function isValidQuantity(
    quantity: number,
    minQty: number,
    maxQty: number,
    stepSize: number
): boolean {
    // Check if within range
    if (quantity < minQty || quantity > maxQty) {
        return false;
    }

    // Check if matches step size
    const steps = Math.round((quantity - minQty) / stepSize);
    const validQuantity = minQty + steps * stepSize;

    return Math.abs(quantity - validQuantity) < stepSize / 10;
}

/**
 * Round quantity to step size
 */
export function roundToStepSize(quantity: number, stepSize: number): number {
    return Math.floor(quantity / stepSize) * stepSize;
}

// ============================================================================
// SYMBOL PARSING (original)
// ============================================================================

/**
 * Parse symbol into base and quote assets
 */
export function parseSymbol(symbol: string): { base: string; quote: string } | null {
    // Common quote assets
    const quoteAssets = ["USDT", "BUSD", "BTC", "ETH", "BNB", "USD"];

    for (const quote of quoteAssets) {
        if (symbol.endsWith(quote)) {
            const base = symbol.substring(0, symbol.length - quote.length);
            if (base.length > 0) {
                return { base, quote };
            }
        }
    }

    return null;
}

/**
 * Format symbol for display
 */
export function formatSymbol(symbol: string): string {
    const parsed = parseSymbol(symbol);
    if (parsed) {
        return `${parsed.base}/${parsed.quote}`;
    }
    return symbol;
}

// ============================================================================
// RISK CLASSIFICATION (new - moved from risk-checker.ts)
// ============================================================================

import { RiskLevel } from "../generated/prisma";

/**
 * Classify a Binance margin level into our RiskLevel enum.
 * null → DANGER (unknown = treat as dangerous)
 */
export function classifyRisk(marginLevel: number | null): RiskLevel {
    if (marginLevel === null || marginLevel === undefined) return "DANGER";
    if (marginLevel >= 2.0) return "SAFE";
    if (marginLevel >= 1.5) return "WARNING";
    return "DANGER";
}
