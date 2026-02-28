/**
 * Binance Client Wrapper
 * 
 * Centralized Binance client management with:
 * - Standard error handling
 * - Type-safe configuration
 * - Logging capabilities
 * - Client initialization
 */

import { Spot } from "@binance/spot";
import { MarginTrading } from "@binance/margin-trading";
import type { Exchange } from "../generated/prisma";
import { env } from "../lib/env";

// ============================================================================
// TYPES
// ============================================================================

export interface BinanceConfig {
    apiKey: string;
    apiSecret: string;
}

export interface BinanceError {
    code: string;
    msg: string;
}

export interface BinanceResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}

// ============================================================================
// CLIENT CREATION
// ============================================================================

/**
 * Create a Binance Spot client
 */
export function createSpotClient(config: BinanceConfig): Spot {
    return new Spot({
        configurationRestAPI: {
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            basePath: env.BINANCE_BASE_URL,
        },
    });
}

/**
 * Create a Binance Margin Trading client
 */
export function createMarginClient(config: BinanceConfig): MarginTrading {
    return new MarginTrading({
        configurationRestAPI: {
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            basePath: env.BINANCE_BASE_URL,
        },
    });
}

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

interface CachedClients {
    spot: Spot;
    margin: MarginTrading;
}

const clientCache = new Map<string, CachedClients>();

/**
 * Get configured Binance clients for an exchange.
 * Caches instances by exchangeId for performance.
 */
export function getBinanceClient(exchange: Exchange): CachedClients {
    const cached = clientCache.get(exchange.id);
    if (cached) return cached;

    // Use plain text keys (decryption removed for now per user request)
    const config: BinanceConfig = {
        apiKey: exchange.apiKey,
        apiSecret: exchange.apiSecret,
    };

    const clients: CachedClients = {
        spot: createSpotClient(config),
        margin: createMarginClient(config),
    };

    clientCache.set(exchange.id, clients);
    return clients;
}

/**
 * Clear a cached client (e.g. if API keys are updated)
 */
export function clearCachedClient(exchangeId: string): void {
    clientCache.delete(exchangeId);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Standardized Binance error handler
 * Converts Binance API errors to user-friendly messages
 */
export function handleBinanceError<T = unknown>(error: unknown): BinanceResult<T> {
    console.error("[Binance SDK] Error:", error);

    // Handle Binance API errors
    if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
    ) {
        const binanceError = (
            error.response as { data: BinanceError }
        ).data;

        // Map common Binance error codes to user-friendly messages
        const errorMessage = mapBinanceErrorCode(binanceError.code, binanceError.msg);

        return {
            success: false,
            error: errorMessage,
            errorCode: binanceError.code,
        };
    }

    // Handle network or other errors
    const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

    return {
        success: false,
        error: errorMessage,
    };
}

/**
 * Map Binance error codes to user-friendly messages
 */
function mapBinanceErrorCode(code: string, originalMsg: string): string {
    const errorMap: Record<string, string> = {
        // Authentication errors
        "-1022": "Invalid API key or signature",
        "-2015": "Invalid API key, IP, or permissions for action",

        // Order errors
        "-1013": "Invalid quantity - check symbol filters",
        "-1111": "Precision is over the maximum defined for this asset",
        "-2010": "Insufficient balance",
        "-2011": "Unknown order",

        // Symbol errors
        "-1121": "Invalid symbol",

        // Rate limiting
        "-1003": "Too many requests - rate limit exceeded",

        // Market errors
        "-1104": "Not all sent parameters were read",
        "-1015": "Too many new orders - rate limit exceeded",
    };

    return errorMap[code] || originalMsg || "Binance API error";
}

/**
 * Success result helper
 */
export function successResult<T>(data: T): BinanceResult<T> {
    return {
        success: true,
        data,
    };
}

/**
 * Error result helper
 */
export function errorResult<T = unknown>(error: string, code?: string): BinanceResult<T> {
    return {
        success: false,
        error,
        errorCode: code,
    };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate Binance configuration
 */
export function validateConfig(config: BinanceConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === "") {
        throw new Error("API key is required");
    }
    if (!config.apiSecret || config.apiSecret.trim() === "") {
        throw new Error("API secret is required");
    }
    return true;
}

/**
 * Verify Binance credentials by attempting a simple authenticated request.
 * Useful for checking keys before saving them to the database.
 */
export async function verifyBinanceCredentials(config: BinanceConfig): Promise<BinanceResult<{ valid: boolean; accountType: string }>> {
    try {
        validateConfig(config);
        const client = createSpotClient(config);
        console.log(`[Binance] Verifying credentials for API Key: ${config.apiKey.slice(0, 4)}...`);

        // Attempt to fetch account info (requires valid API Key + Signature)
        const response = await client.restAPI.getAccount();
        const status = response.status;
        console.log(`[Binance] Account info response status: ${status}`);
        const data = await response.data();

        return successResult({
            valid: true,
            accountType: (data as any).canTrade ? "TRADE_ENABLED" : "READ_ONLY",
        });
    } catch (error) {
        return handleBinanceError(error);
    }
}

/**
 * Validate symbol format
 */
export function validateSymbol(symbol: string): boolean {
    // Binance symbols are uppercase, no spaces, typically 6-10 characters
    const symbolRegex = /^[A-Z0-9]{4,12}$/;
    return symbolRegex.test(symbol);
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log Binance request (for debugging)
 */
export function logRequest(operation: string, params: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
        console.log(`[Binance SDK] ${operation}:`, params);
    }
}

/**
 * Log Binance response (for debugging)
 */
export function logResponse(operation: string, response: unknown): void {
    if (process.env.NODE_ENV === "development") {
        console.log(`[Binance SDK] ${operation} response:`, response);
    }
}

// ============================================================================
// STRUCTURED ERROR (new)
// ============================================================================

export class BinanceOrderError extends Error {
    code: string;
    constructor(message: string, code?: string) {
        super(message);
        this.name = "BinanceOrderError";
        this.code = code ?? "UNKNOWN";
    }
}

/**
 * Converts a raw Binance SDK throw into a BinanceOrderError.
 */
export function extractBinanceError(raw: unknown): BinanceOrderError {
    if (raw && typeof raw === "object" && "response" in raw) {
        const resp = (raw as { response?: { data?: { code?: string; msg?: string } } }).response;
        const code = resp?.data?.code?.toString() ?? "UNKNOWN";
        const msg = resp?.data?.msg ?? (raw instanceof Error ? raw.message : "Binance error");
        return new BinanceOrderError(msg, code);
    }
    const msg = raw instanceof Error ? raw.message : "Binance error";
    return new BinanceOrderError(msg);
}
