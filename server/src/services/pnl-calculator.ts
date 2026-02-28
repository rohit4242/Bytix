/**
 * PnL Calculator
 *
 * calculatePnl        — realized P&L on position close
 * calculateUnrealizedPnl — live unrealized P&L for open positions
 *
 * Per doc 06. Always use Decimal for financial calculations.
 */

import type { TradeSide } from "../generated/prisma";
import { Decimal } from "../generated/prisma/runtime/client";

// ─── Types ────────────────────────────────────────────────────────────────

export interface PnlResult {
    realized: Decimal;          // net P&L after fees
    percent: Decimal;           // % of notional value
    percentOnCapital: Decimal;  // % return on actual capital (with leverage)
}

// ─── Realized PnL ─────────────────────────────────────────────────────────

/**
 * Calculate realized P&L when a position closes.
 *
 * LONG:  realizedPnl = (exitPrice - entryPrice) × quantity − totalFees
 * SHORT: realizedPnl = (entryPrice - exitPrice) × quantity − totalFees
 * pnlPercent = (realizedPnl / notional) × 100
 * percentOnCapital = (realizedPnl / (notional / leverage)) × 100
 */
export function calculatePnl(
    position: {
        side: TradeSide;
        entryPrice: Decimal;
        quantity: Decimal;
        leverage: number;
        fee: Decimal; // accumulated entry fees
    },
    exitPrice: Decimal,
    exitFee: Decimal
): PnlResult {
    const entry = Number(position.entryPrice);
    const exit = Number(exitPrice);
    const qty = Number(position.quantity);
    const fees = Number(position.fee) + Number(exitFee);

    const grossPnl =
        position.side === "LONG"
            ? (exit - entry) * qty
            : (entry - exit) * qty;

    const realized = grossPnl - fees;
    const notional = entry * qty;
    const capital = notional / (position.leverage || 1);

    return {
        realized: new Decimal(realized.toFixed(8)),
        percent: new Decimal(((realized / notional) * 100).toFixed(4)),
        percentOnCapital: new Decimal(((realized / capital) * 100).toFixed(4)),
    };
}

// ─── Unrealized PnL ───────────────────────────────────────────────────────

/**
 * Calculate unrealized P&L for an open position (not persisted, calculated on the fly).
 */
export function calculateUnrealizedPnl(
    position: {
        side: TradeSide;
        entryPrice: Decimal;
        quantity: Decimal;
        leverage: number;
    },
    currentPrice: number
): number {
    const entry = Number(position.entryPrice);
    const qty = Number(position.quantity);

    return position.side === "LONG"
        ? (currentPrice - entry) * qty
        : (entry - currentPrice) * qty;
}
