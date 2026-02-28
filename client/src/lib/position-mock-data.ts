// ─────────────────────────────────────────────────────────────
// Types (mirroring Prisma enums & models)
// ─────────────────────────────────────────────────────────────

export type TradeSide = "LONG" | "SHORT"
export type TradeType = "SPOT" | "MARGIN"
export type MarginType = "CROSS"
export type PositionStatus = "OPEN" | "CLOSED" | "PARTIALLY_CLOSED" | "LIQUIDATED"
export type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT" | "OCO" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT_LIMIT"
export type OrderPurpose = "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "BORROW" | "REPAY"
export type OrderStatus = "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED" | "ERROR"
export type SideEffectType = "NO_SIDE_EFFECT" | "MARGIN_BUY" | "AUTO_REPAY"

export interface MockPosition {
  id: string
  userId: string
  botId: string | null
  botName: string | null
  symbol: string
  side: TradeSide
  tradeType: TradeType
  marginType: MarginType | null
  leverage: number
  entryPrice: number | null
  exitPrice: number | null
  currentPrice: number
  quantity: number
  notionalUsdt: number | null
  realizedPnl: number
  unrealizedPnl: number
  pnlPercent: number
  fee: number
  status: PositionStatus
  stopLossOrderId: string | null
  takeProfitOrderId: string | null
  openedAt: string
  closedAt: string | null
}

export interface MockOrder {
  id: string
  positionId: string
  binanceOrderId: string | null
  symbol: string
  side: "BUY" | "SELL"
  type: OrderType
  purpose: OrderPurpose
  sideEffect: SideEffectType
  quantity: number
  price: number | null
  stopPrice: number | null
  filledQuantity: number
  fillPercent: number
  avgFillPrice: number | null
  fee: number
  feeAsset: string | null
  status: OrderStatus
  submittedAt: string
  filledAt: string | null
}

// ─────────────────────────────────────────────────────────────
// Utility / formatting helpers
// ─────────────────────────────────────────────────────────────

export function formatCurrency(value: number, decimals = 2): string {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  if (value > 0) return `+$${formatted}`
  if (value < 0) return `-$${formatted}`
  return `$${formatted}`
}

export function formatPrice(value: number | null): string {
  if (value === null) return "—"
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function formatQuantity(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 })
}

export function formatPnlPercent(value: number): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function calculatePnlUsd(position: MockPosition): number {
  if (position.status === "OPEN") {
    if (position.side === "LONG") {
      return (position.currentPrice - (position.entryPrice || 0)) * position.quantity
    }
    return ((position.entryPrice || 0) - position.currentPrice) * position.quantity
  }
  return position.realizedPnl
}

export function calculatePnlPercent(position: MockPosition): number {
  const pnl = calculatePnlUsd(position)
  const notional = position.notionalUsdt || 1
  return (pnl / notional) * 100
}

export function calculateTotalVolume(orders: MockOrder[]): number {
  return orders.reduce((sum, o) => {
    return sum + o.filledQuantity * (o.avgFillPrice || o.price || 0)
  }, 0)
}

export function getOrdersForPosition(positionId: string): MockOrder[] {
  return MOCK_ORDERS.filter((o) => o.positionId === positionId)
}

// ─────────────────────────────────────────────────────────────
// Mock Positions
// ─────────────────────────────────────────────────────────────

export const MOCK_POSITIONS: MockPosition[] = [
  // ── OPEN positions ──
  {
    id: "pos-001",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "LONG",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83120.81,
    exitPrice: null,
    currentPrice: 83450.22,
    quantity: 0.14999,
    notionalUsdt: 12467.29,
    realizedPnl: 0,
    unrealizedPnl: 49.41,
    pnlPercent: 0.4,
    fee: 4.98,
    status: "OPEN",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-02-25T13:00:00Z",
    closedAt: null,
  },
  {
    id: "pos-002",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "ETHUSDT",
    side: "LONG",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 2,
    entryPrice: 3380.5,
    exitPrice: null,
    currentPrice: 3421.55,
    quantity: 2.5,
    notionalUsdt: 8451.25,
    realizedPnl: 0,
    unrealizedPnl: 102.63,
    pnlPercent: 1.21,
    fee: 3.38,
    status: "OPEN",
    stopLossOrderId: "sl-002",
    takeProfitOrderId: "tp-002",
    openedAt: "2026-02-24T09:30:00Z",
    closedAt: null,
  },
  {
    id: "pos-003",
    userId: "user-1",
    botId: "bot-groot",
    botName: "Groot",
    symbol: "SOLUSDT",
    side: "SHORT",
    tradeType: "SPOT",
    marginType: null,
    leverage: 1,
    entryPrice: 182.4,
    exitPrice: null,
    currentPrice: 178.32,
    quantity: 15,
    notionalUsdt: 2736.0,
    realizedPnl: 0,
    unrealizedPnl: 61.2,
    pnlPercent: 2.24,
    fee: 1.09,
    status: "OPEN",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-02-25T16:45:00Z",
    closedAt: null,
  },
  {
    id: "pos-004",
    userId: "user-1",
    botId: null,
    botName: null,
    symbol: "BTCUSDT",
    side: "LONG",
    tradeType: "SPOT",
    marginType: null,
    leverage: 1,
    entryPrice: 82950.0,
    exitPrice: null,
    currentPrice: 83450.22,
    quantity: 0.05,
    notionalUsdt: 4147.5,
    realizedPnl: 0,
    unrealizedPnl: 25.01,
    pnlPercent: 0.6,
    fee: 1.66,
    status: "OPEN",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-02-26T08:15:00Z",
    closedAt: null,
  },

  // ── CLOSED positions ──
  {
    id: "pos-101",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83120.81,
    exitPrice: 83094.095,
    currentPrice: 83094.095,
    quantity: 0.14999,
    notionalUsdt: 12467.29,
    realizedPnl: 4.01,
    unrealizedPnl: 0,
    pnlPercent: 0.03,
    fee: 4.98,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T13:00:00Z",
    closedAt: "2026-01-31T13:30:00Z",
  },
  {
    id: "pos-102",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83120.81,
    exitPrice: 83094.78,
    currentPrice: 83094.78,
    quantity: 0.14999,
    notionalUsdt: 12467.29,
    realizedPnl: 3.9,
    unrealizedPnl: 0,
    pnlPercent: 0.03,
    fee: 4.98,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T13:00:00Z",
    closedAt: "2026-01-31T13:30:00Z",
  },
  {
    id: "pos-103",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83289.08,
    exitPrice: 83123.02,
    currentPrice: 83123.02,
    quantity: 0.14999,
    notionalUsdt: 12492.42,
    realizedPnl: 24.91,
    unrealizedPnl: 0,
    pnlPercent: 0.2,
    fee: 4.99,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T12:00:00Z",
    closedAt: "2026-01-31T12:30:00Z",
  },
  {
    id: "pos-104",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83237.5518,
    exitPrice: 83161.7458,
    currentPrice: 83161.7458,
    quantity: 0.14999,
    notionalUsdt: 12484.7,
    realizedPnl: 11.37,
    unrealizedPnl: 0,
    pnlPercent: 0.09,
    fee: 4.99,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T11:00:00Z",
    closedAt: "2026-01-31T11:30:00Z",
  },
  {
    id: "pos-105",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 83233.7251,
    exitPrice: 83244.66,
    currentPrice: 83244.66,
    quantity: 0.14999,
    notionalUsdt: 12484.13,
    realizedPnl: -1.64,
    unrealizedPnl: 0,
    pnlPercent: -0.01,
    fee: 4.99,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T09:30:00Z",
    closedAt: "2026-01-31T10:00:00Z",
  },
  {
    id: "pos-106",
    userId: "user-1",
    botId: "bot-rocket",
    botName: "Rocket",
    symbol: "BTCUSDT",
    side: "SHORT",
    tradeType: "MARGIN",
    marginType: "CROSS",
    leverage: 3,
    entryPrice: 84115.7975,
    exitPrice: 83813.6943,
    currentPrice: 83813.6943,
    quantity: 0.14999,
    notionalUsdt: 12616.97,
    realizedPnl: 45.31,
    unrealizedPnl: 0,
    pnlPercent: 0.36,
    fee: 5.05,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-31T07:00:00Z",
    closedAt: "2026-01-31T07:30:00Z",
  },
  {
    id: "pos-107",
    userId: "user-1",
    botId: "bot-nebula",
    botName: "Nebula",
    symbol: "ETHUSDT",
    side: "LONG",
    tradeType: "SPOT",
    marginType: null,
    leverage: 1,
    entryPrice: 3350.2,
    exitPrice: 3421.55,
    currentPrice: 3421.55,
    quantity: 3.0,
    notionalUsdt: 10050.6,
    realizedPnl: 214.05,
    unrealizedPnl: 0,
    pnlPercent: 2.13,
    fee: 4.02,
    status: "CLOSED",
    stopLossOrderId: null,
    takeProfitOrderId: null,
    openedAt: "2026-01-28T14:00:00Z",
    closedAt: "2026-01-30T10:15:00Z",
  },
  {
    id: "pos-108",
    userId: "user-1",
    botId: "bot-groot",
    botName: "Groot",
    symbol: "SOLUSDT",
    side: "LONG",
    tradeType: "SPOT",
    marginType: null,
    leverage: 1,
    entryPrice: 175.8,
    exitPrice: 171.2,
    currentPrice: 171.2,
    quantity: 20.0,
    notionalUsdt: 3516.0,
    realizedPnl: -92.0,
    unrealizedPnl: 0,
    pnlPercent: -2.62,
    fee: 1.41,
    status: "CLOSED",
    stopLossOrderId: "sl-108",
    takeProfitOrderId: null,
    openedAt: "2026-01-27T08:00:00Z",
    closedAt: "2026-01-27T16:45:00Z",
  },
]

// ─────────────────────────────────────────────────────────────
// Mock Orders
// ─────────────────────────────────────────────────────────────

export const MOCK_ORDERS: MockOrder[] = [
  // pos-001 orders (OPEN LONG BTC MARGIN)
  {
    id: "ord-001a",
    positionId: "pos-001",
    binanceOrderId: "9691e593-1d8f",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "MARGIN_BUY",
    quantity: 0.14999,
    price: 83120.81,
    stopPrice: null,
    filledQuantity: 0.14999,
    fillPercent: 100,
    avgFillPrice: 83120.81,
    fee: 4.98,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-02-25T13:00:00Z",
    filledAt: "2026-02-25T13:00:00Z",
  },
  // pos-002 orders (OPEN LONG ETH MARGIN)
  {
    id: "ord-002a",
    positionId: "pos-002",
    binanceOrderId: "a1b2c3d4-e5f6",
    symbol: "ETHUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "MARGIN_BUY",
    quantity: 2.5,
    price: 3380.5,
    stopPrice: null,
    filledQuantity: 2.5,
    fillPercent: 100,
    avgFillPrice: 3380.5,
    fee: 3.38,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-02-24T09:30:00Z",
    filledAt: "2026-02-24T09:30:00Z",
  },
  // pos-003 orders (OPEN SHORT SOL SPOT)
  {
    id: "ord-003a",
    positionId: "pos-003",
    binanceOrderId: "f7g8h9i0-j1k2",
    symbol: "SOLUSDT",
    side: "SELL",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 15,
    price: 182.4,
    stopPrice: null,
    filledQuantity: 15,
    fillPercent: 100,
    avgFillPrice: 182.4,
    fee: 1.09,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-02-25T16:45:00Z",
    filledAt: "2026-02-25T16:45:00Z",
  },
  // pos-004 orders (OPEN LONG BTC SPOT)
  {
    id: "ord-004a",
    positionId: "pos-004",
    binanceOrderId: "l3m4n5o6-p7q8",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 0.05,
    price: 82950.0,
    stopPrice: null,
    filledQuantity: 0.05,
    fillPercent: 100,
    avgFillPrice: 82950.0,
    fee: 1.66,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-02-26T08:15:00Z",
    filledAt: "2026-02-26T08:15:00Z",
  },
  // pos-101 orders (CLOSED SHORT BTC MARGIN)
  {
    id: "ord-101a",
    positionId: "pos-101",
    binanceOrderId: "9691e593-1d8f",
    symbol: "BTCUSDT",
    side: "SELL",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "MARGIN_BUY",
    quantity: 0.14999,
    price: 83120.81,
    stopPrice: null,
    filledQuantity: 0.14999,
    fillPercent: 100,
    avgFillPrice: 83120.81,
    fee: 2.49,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-31T13:00:00Z",
    filledAt: "2026-01-31T13:00:00Z",
  },
  {
    id: "ord-101b",
    positionId: "pos-101",
    binanceOrderId: "ab5e5670-cfa5",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "EXIT",
    sideEffect: "AUTO_REPAY",
    quantity: 0.14999,
    price: 83094.095,
    stopPrice: null,
    filledQuantity: 0.14999,
    fillPercent: 100,
    avgFillPrice: 83094.095,
    fee: 2.49,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-31T13:30:00Z",
    filledAt: "2026-01-31T13:30:00Z",
  },
  // pos-103 orders
  {
    id: "ord-103a",
    positionId: "pos-103",
    binanceOrderId: "c4d5e6f7-g8h9",
    symbol: "BTCUSDT",
    side: "SELL",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "MARGIN_BUY",
    quantity: 0.14999,
    price: 83289.08,
    stopPrice: null,
    filledQuantity: 0.14999,
    fillPercent: 100,
    avgFillPrice: 83289.08,
    fee: 2.5,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-31T12:00:00Z",
    filledAt: "2026-01-31T12:00:00Z",
  },
  {
    id: "ord-103b",
    positionId: "pos-103",
    binanceOrderId: "i0j1k2l3-m4n5",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "EXIT",
    sideEffect: "AUTO_REPAY",
    quantity: 0.14999,
    price: 83123.02,
    stopPrice: null,
    filledQuantity: 0.14999,
    fillPercent: 100,
    avgFillPrice: 83123.02,
    fee: 2.49,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-31T12:30:00Z",
    filledAt: "2026-01-31T12:30:00Z",
  },
  // pos-107 orders (CLOSED LONG ETH SPOT)
  {
    id: "ord-107a",
    positionId: "pos-107",
    binanceOrderId: "o6p7q8r9-s0t1",
    symbol: "ETHUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 3.0,
    price: 3350.2,
    stopPrice: null,
    filledQuantity: 3.0,
    fillPercent: 100,
    avgFillPrice: 3350.2,
    fee: 2.01,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-28T14:00:00Z",
    filledAt: "2026-01-28T14:00:00Z",
  },
  {
    id: "ord-107b",
    positionId: "pos-107",
    binanceOrderId: "u2v3w4x5-y6z7",
    symbol: "ETHUSDT",
    side: "SELL",
    type: "MARKET",
    purpose: "EXIT",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 3.0,
    price: 3421.55,
    stopPrice: null,
    filledQuantity: 3.0,
    fillPercent: 100,
    avgFillPrice: 3421.55,
    fee: 2.01,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-30T10:15:00Z",
    filledAt: "2026-01-30T10:15:00Z",
  },
  // pos-108 orders (CLOSED LONG SOL SPOT — loss)
  {
    id: "ord-108a",
    positionId: "pos-108",
    binanceOrderId: "a8b9c0d1-e2f3",
    symbol: "SOLUSDT",
    side: "BUY",
    type: "MARKET",
    purpose: "ENTRY",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 20.0,
    price: 175.8,
    stopPrice: null,
    filledQuantity: 20.0,
    fillPercent: 100,
    avgFillPrice: 175.8,
    fee: 0.7,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-27T08:00:00Z",
    filledAt: "2026-01-27T08:00:00Z",
  },
  {
    id: "ord-108b",
    positionId: "pos-108",
    binanceOrderId: "g4h5i6j7-k8l9",
    symbol: "SOLUSDT",
    side: "SELL",
    type: "STOP_LOSS",
    purpose: "STOP_LOSS",
    sideEffect: "NO_SIDE_EFFECT",
    quantity: 20.0,
    price: 171.2,
    stopPrice: 171.5,
    filledQuantity: 20.0,
    fillPercent: 100,
    avgFillPrice: 171.2,
    fee: 0.71,
    feeAsset: "USDT",
    status: "FILLED",
    submittedAt: "2026-01-27T16:45:00Z",
    filledAt: "2026-01-27T16:45:00Z",
  },
]
