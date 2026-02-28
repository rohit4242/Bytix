import {
    BotStatus,
    ExchangeName,
    MarginType,
    OrderPurpose,
    OrderStatus,
    OrderType,
    PositionMode,
    PositionStatus,
    RiskLevel,
    Role,
    SignalAction,
    SignalStatus,
    SideEffectType,
    TradeType,
    TradeSide,
    TransactionType,
} from "@/generated/prisma"

// Re-export all enums for easy import throughout the app
export {
    BotStatus,
    ExchangeName,
    MarginType,
    OrderPurpose,
    OrderStatus,
    OrderType,
    PositionMode,
    PositionStatus,
    RiskLevel,
    Role,
    SignalAction,
    SignalStatus,
    SideEffectType,
    TradeType,
    TradeSide,
    TransactionType,
}

// ─── Common UI Types ────────────────────────────────────────────

export type UserRole = "ADMIN" | "AGENT" | "CUSTOMER"

export interface UserSummary {
    id: string
    name: string | null
    email: string
    role: UserRole
    agentId: string | null
    createdAt: Date
    _count?: {
        bots: number
        positions: number
    }
}

export interface ExchangeSafe {
    id: string
    label: string | null
    name: ExchangeName
    positionMode: PositionMode
    isActive: boolean
    createdAt: Date
}

export interface BotSummary {
    id: string
    name: string
    status: BotStatus
    tradeType: TradeType
    marginType: MarginType | null
    pairs: string[]
    tradeAmount: string | number
    amountUnit: string
    leverage: number
    slPercent: string | number | null
    tpPercent: string | number | null
    webhookSecret: string | null
    createdAt: Date
    exchange: {
        id: string
        label: string | null
        name: ExchangeName
        isActive: boolean
    }
}

export interface PositionSummary {
    id: string
    symbol: string
    side: TradeSide
    tradeType: TradeType
    status: PositionStatus
    entryPrice: string | number | null
    exitPrice: string | number | null
    quantity: string | number
    notionalUsdt: string | number | null
    realizedPnl: string | number
    unrealizedPnl: string | number
    pnlPercent: string | number
    fee: string | number
    leverage: number
    openedAt: Date
    closedAt: Date | null
    botId: string | null
    bot: { name: string } | null
}

export interface SignalSummary {
    id: string
    action: SignalAction
    symbol: string
    status: SignalStatus
    errorMessage: string | null
    processedAt: Date | null
    createdAt: Date
    positionId: string | null
}

export interface PortfolioStats {
    id: string
    userId: string
    totalPnl: string | number
    totalPnlPercent: string | number
    winRate: string | number
    totalTrades: number
    winningTrades: number
    losingTrades: number
    dailyPnl: string | number
    weeklyPnl: string | number
    monthlyPnl: string | number
    totalBalance: string | number
    availableBalance: string | number
    totalDebt: string | number
    updatedAt: Date
}
