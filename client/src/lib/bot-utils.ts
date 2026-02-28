import { SideEffectType } from "@/generated/prisma"

// --- Types ---

export interface SymbolConstraints {
    tickSize: string
    stepSize: string
    minQty: string
    minNotional: string
}

export interface AssetBalance {
    asset: string
    free: string
    locked?: string
}

export interface MarginBalance extends AssetBalance {
    borrowed: string
    maxBorrow: string
}

export interface BackendTradeData {
    symbol: string
    baseAsset: string
    quoteAsset: string
    price: number
    constraints: SymbolConstraints
    balances: {
        spot: {
            quote: AssetBalance
            base: AssetBalance
        }
        margin: {
            allowed: boolean
            marginLevel: string
            quote: MarginBalance
            base: MarginBalance
        }
    }
    apiError: string | null
}

export interface TradeSettings {
    tradeAmount: number
    amountUnit: "quote" | "base"
    leverage: number
    sideEffect: SideEffectType | string
}

export interface FieldHint {
    key: string
    label: string
    status: "ok" | "error" | "warn"
    message: string
}

export interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
    fieldHints: FieldHint[]
    buyingPower: number
    buyingPowerUsed: number
    buyingPowerPercent: number
}

// --- Logic ---

/**
 * Compute buying power for a specific account type and trade settings.
 */
export function computeBuyingPower(
    data: BackendTradeData,
    settings: TradeSettings,
    accountType: "SPOT" | "MARGIN" | "spot" | "margin"
): { total: number; used: number } {
    const effectiveAmount = settings.tradeAmount * settings.leverage
    const isSpot = accountType.toUpperCase() === "SPOT"

    if (isSpot) {
        if (settings.amountUnit === "quote") {
            const free = parseFloat(data.balances.spot.quote.free)
            return { total: free, used: settings.tradeAmount }
        } else {
            const free = parseFloat(data.balances.spot.base.free)
            return { total: free, used: settings.tradeAmount }
        }
    } else {
        // Margin: buying power = free + maxBorrow
        if (settings.amountUnit === "quote") {
            const free = parseFloat(data.balances.margin.quote.free)
            const maxBorrow = parseFloat(data.balances.margin.quote.maxBorrow)
            return { total: free + maxBorrow, used: effectiveAmount }
        } else {
            const free = parseFloat(data.balances.margin.base.free)
            const maxBorrow = parseFloat(data.balances.margin.base.maxBorrow)
            return { total: free + maxBorrow, used: effectiveAmount }
        }
    }
}

/**
 * Core validation logic for a trade signal/bot configuration.
 */
export function validateTrade(
    data: BackendTradeData,
    settings: TradeSettings,
    accountType: "SPOT" | "MARGIN" | "spot" | "margin"
): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const fieldHints: FieldHint[] = []

    if (data.apiError) {
        errors.push(data.apiError)
    }

    const effectiveAmount = settings.tradeAmount * settings.leverage
    const tradeAmountQuote =
        settings.amountUnit === "quote"
            ? effectiveAmount
            : effectiveAmount * data.price

    const tradeAmountBase =
        settings.amountUnit === "base"
            ? effectiveAmount
            : effectiveAmount / data.price

    const minNotional = parseFloat(data.constraints.minNotional)
    const minQty = parseFloat(data.constraints.minQty)
    const stepSize = parseFloat(data.constraints.stepSize)

    // Zero amount check
    if (settings.tradeAmount <= 0) {
        errors.push("Trade amount must be greater than zero.")
        fieldHints.push({
            key: "amount",
            label: "Amount",
            status: "error",
            message: "Enter a value greater than 0",
        })
    }

    // Min notional check
    if (settings.tradeAmount > 0 && tradeAmountQuote < minNotional) {
        const minRequired =
            settings.amountUnit === "quote"
                ? `${minNotional.toFixed(2)} ${data.quoteAsset}`
                : `${(minNotional / data.price).toFixed(8)} ${data.baseAsset}`
        errors.push(`Below minimum notional of ${minNotional} ${data.quoteAsset}.`)
        fieldHints.push({
            key: "minNotional",
            label: "Min Notional",
            status: "error",
            message: `Min ${minRequired}`,
        })
    } else if (settings.tradeAmount > 0) {
        fieldHints.push({
            key: "minNotional",
            label: "Min Notional",
            status: "ok",
            message: `${minNotional} ${data.quoteAsset}`,
        })
    }

    // Min qty check
    if (settings.tradeAmount > 0 && tradeAmountBase < minQty) {
        errors.push(`Below minimum quantity of ${minQty} ${data.baseAsset}.`)
        fieldHints.push({
            key: "minQty",
            label: "Min Qty",
            status: "error",
            message: `Min ${minQty} ${data.baseAsset}`,
        })
    } else if (settings.tradeAmount > 0) {
        fieldHints.push({
            key: "minQty",
            label: "Min Qty",
            status: "ok",
            message: `${minQty} ${data.baseAsset}`,
        })
    }

    // Step size check
    if (settings.tradeAmount > 0) {
        const remainder = tradeAmountBase % stepSize
        if (remainder > stepSize / 10 && remainder < stepSize - stepSize / 10) {
            warnings.push(`Qty will be rounded to step size (${stepSize}).`)
            fieldHints.push({
                key: "stepSize",
                label: "Step Size",
                status: "warn",
                message: `Will round to ${stepSize}`,
            })
        } else {
            fieldHints.push({
                key: "stepSize",
                label: "Step Size",
                status: "ok",
                message: `${stepSize}`,
            })
        }
    }

    // Buying power
    const bp = computeBuyingPower(data, settings, accountType)

    if (settings.tradeAmount > 0 && bp.used > bp.total) {
        const unit =
            settings.amountUnit === "quote" ? data.quoteAsset : data.baseAsset
        errors.push(
            `Exceeds buying power. Max: ${bp.total.toFixed(settings.amountUnit === "quote" ? 2 : 8)} ${unit}.`
        )
    }

    if (
        accountType.toUpperCase() === "MARGIN" &&
        settings.leverage > 1 &&
        errors.length === 0
    ) {
        warnings.push(
            `${settings.leverage}x leverage increases liquidation risk.`
        )
    }

    const pct = bp.total > 0 ? Math.min((bp.used / bp.total) * 100, 100) : 0

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fieldHints,
        buyingPower: bp.total,
        buyingPowerUsed: bp.used,
        buyingPowerPercent: settings.tradeAmount > 0 ? pct : 0,
    }
}

/**
 * Calculates a trade estimate based on effective amount (including leverage).
 */
export function calculateTradeEstimate(
    data: BackendTradeData,
    settings: { tradeAmount: number; leverage: number; amountUnit: "quote" | "base" }
) {
    const effectiveAmount = settings.tradeAmount * settings.leverage
    const price = data.price || 0

    if (effectiveAmount <= 0 || price <= 0) {
        return {
            executableQty: "0.00000000",
            estimatedNotional: "0.00",
        }
    }

    const stepSize = parseFloat(data.constraints.stepSize)

    let rawQty: number
    if (settings.amountUnit === "quote") {
        rawQty = effectiveAmount / price
    } else {
        rawQty = effectiveAmount
    }

    const executableQty = Math.floor(rawQty / stepSize) * stepSize
    const estimatedNotional = executableQty * price

    return {
        executableQty: executableQty.toFixed(8),
        estimatedNotional: estimatedNotional.toFixed(2),
    }
}
