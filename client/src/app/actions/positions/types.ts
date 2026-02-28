export type TradeSide = "LONG" | "SHORT"
export type TradeType = "SPOT" | "MARGIN"
export type MarginType = "CROSS" | "ISOLATED"
export type PositionStatus = "OPEN" | "CLOSED" | "PARTIALLY_CLOSED" | "LIQUIDATED"
export type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT" | "OCO" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT_LIMIT"
export type OrderPurpose = "ENTRY" | "EXIT" | "STOP_LOSS" | "TAKE_PROFIT" | "BORROW" | "REPAY"
export type OrderStatus = "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED" | "EXPIRED" | "ERROR"
export type SideEffectType = "NO_SIDE_EFFECT" | "MARGIN_BUY" | "AUTO_REPAY"

export interface Position {
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

export interface Order {
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
