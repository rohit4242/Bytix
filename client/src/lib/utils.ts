import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Number Formatting ─────────────────────────────────────────

export function formatCurrency(
  value: number | string,
  decimals = 2
): string {
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatPrice(value: number | string): string {
  return formatCurrency(value, 2)
}

export function formatQuantity(value: number | string, decimals = 5): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(value: number | string, decimals = 2): string {
  const n = Number(value)
  const prefix = n > 0 ? "+" : ""
  return `${prefix}${n.toFixed(decimals)}%`
}

export function formatPnl(value: number | string): string {
  const n = Number(value)
  const prefix = n > 0 ? "+" : ""
  return `${prefix}${formatCurrency(n)}`
}

export function pnlColor(value: number | string): string {
  const n = Number(value)
  if (n > 0) return "text-green-400"
  if (n < 0) return "text-red-400"
  return "text-muted-foreground"
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Trading Calculations ─────────────────────────────────────

/**
 * Calculates unrealized P/L for a position.
 */
export function calculatePnl(params: {
  side: "LONG" | "SHORT" | string
  entryPrice: number
  currentPrice: number
  quantity: number
}): number {
  const { side, entryPrice, currentPrice, quantity } = params
  if (side === "LONG") {
    return (currentPrice - entryPrice) * quantity
  } else {
    return (entryPrice - currentPrice) * quantity
  }
}

/**
 * Calculates ROE (Return on Equity) percentage.
 * Formula: (P/L / Margin) * 100
 * Where Margin = (Quantity * EntryPrice) / Leverage
 */
export function calculateRoi(params: {
  pnl: number
  quantity: number
  entryPrice: number
  leverage: number
}): number {
  const { pnl, quantity, entryPrice, leverage } = params
  const notional = quantity * entryPrice
  if (notional === 0) return 0
  const margin = notional / leverage
  return (pnl / margin) * 100
}

/**
 * Copy text to clipboard with basic error handling
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
    return false
  } catch (err) {
    console.error("Failed to copy:", err)
    return false
  }
}
