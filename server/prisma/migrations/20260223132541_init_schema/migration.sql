-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ExchangeName" AS ENUM ('BINANCE');

-- CreateEnum
CREATE TYPE "MarginType" AS ENUM ('CROSS', 'ISOLATED');

-- CreateEnum
CREATE TYPE "PositionMode" AS ENUM ('ONE_WAY', 'HEDGE');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('SPOT', 'MARGIN');

-- CreateEnum
CREATE TYPE "SignalAction" AS ENUM ('ENTER_LONG', 'ENTER_SHORT', 'EXIT_LONG', 'EXIT_SHORT');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED', 'PARTIALLY_CLOSED', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'OCO', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT_LIMIT');

-- CreateEnum
CREATE TYPE "OrderPurpose" AS ENUM ('ENTRY', 'EXIT', 'STOP_LOSS', 'TAKE_PROFIT', 'BORROW', 'REPAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "SideEffectType" AS ENUM ('NO_SIDE_EFFECT', 'MARGIN_BUY', 'AUTO_REPAY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'BORROW', 'REPAY', 'FEE', 'REALIZED_PNL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'WARNING', 'DANGER');

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalPnlPercent" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "winRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "dailyPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "weeklyPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "monthlyPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalDebt" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "navUsd" DECIMAL(20,8) NOT NULL,
    "spotUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "marginUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "debtUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "netEquity" DECIMAL(20,8) NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exchange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" "ExchangeName" NOT NULL DEFAULT 'BINANCE',
    "label" TEXT,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "positionMode" "PositionMode" NOT NULL DEFAULT 'ONE_WAY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginAccount" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "marginType" "MarginType" NOT NULL,
    "symbol" TEXT,
    "marginLevel" DECIMAL(10,4),
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'SAFE',
    "liquidationPrice" DECIMAL(20,8),
    "totalAssetUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalLiabilityUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "netAssetUsd" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowedAsset" (
    "id" TEXT NOT NULL,
    "marginAccountId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "borrowed" DECIMAL(20,8) NOT NULL,
    "interest" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "free" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "locked" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "netAsset" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "dailyInterestRate" DECIMAL(10,8),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BorrowedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BotStatus" NOT NULL DEFAULT 'ACTIVE',
    "tradeType" "TradeType" NOT NULL DEFAULT 'SPOT',
    "marginType" "MarginType",
    "pairs" TEXT[],
    "tradeAmountUsdt" DECIMAL(20,8) NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "stopLossPercent" DECIMAL(6,4),
    "takeProfitPercent" DECIMAL(6,4),
    "useOco" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "action" "SignalAction" NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'PENDING',
    "rawPayload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "positionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "tradeType" "TradeType" NOT NULL,
    "marginType" "MarginType",
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "entryPrice" DECIMAL(20,8),
    "exitPrice" DECIMAL(20,8),
    "quantity" DECIMAL(20,8) NOT NULL,
    "notionalUsdt" DECIMAL(20,8),
    "realizedPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pnlPercent" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "stopLossOrderId" TEXT,
    "takeProfitOrderId" TEXT,
    "ocoOrderId" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "binanceOrderId" TEXT,
    "binanceClientId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "purpose" "OrderPurpose" NOT NULL,
    "sideEffect" "SideEffectType" NOT NULL DEFAULT 'NO_SIDE_EFFECT',
    "quantity" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8),
    "stopPrice" DECIMAL(20,8),
    "quoteQuantity" DECIMAL(20,8),
    "filledQuantity" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fillPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avgFillPrice" DECIMAL(20,8),
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "feeAsset" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchangeId" TEXT,
    "type" "TransactionType" NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "usdValue" DECIMAL(20,8),
    "binanceTxId" TEXT,
    "positionId" TEXT,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_key" ON "Portfolio"("userId");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_userId_snapshotAt_idx" ON "BalanceSnapshot"("userId", "snapshotAt");

-- CreateIndex
CREATE INDEX "Exchange_userId_idx" ON "Exchange"("userId");

-- CreateIndex
CREATE INDEX "MarginAccount_exchangeId_idx" ON "MarginAccount"("exchangeId");

-- CreateIndex
CREATE UNIQUE INDEX "MarginAccount_exchangeId_marginType_symbol_key" ON "MarginAccount"("exchangeId", "marginType", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "BorrowedAsset_marginAccountId_asset_key" ON "BorrowedAsset"("marginAccountId", "asset");

-- CreateIndex
CREATE INDEX "Bot_userId_idx" ON "Bot"("userId");

-- CreateIndex
CREATE INDEX "Bot_exchangeId_idx" ON "Bot"("exchangeId");

-- CreateIndex
CREATE INDEX "Signal_botId_processed_idx" ON "Signal"("botId", "processed");

-- CreateIndex
CREATE INDEX "Signal_symbol_idx" ON "Signal"("symbol");

-- CreateIndex
CREATE INDEX "Position_userId_status_idx" ON "Position"("userId", "status");

-- CreateIndex
CREATE INDEX "Position_botId_idx" ON "Position"("botId");

-- CreateIndex
CREATE INDEX "Position_symbol_idx" ON "Position"("symbol");

-- CreateIndex
CREATE INDEX "Order_positionId_idx" ON "Order"("positionId");

-- CreateIndex
CREATE INDEX "Order_binanceOrderId_idx" ON "Order"("binanceOrderId");

-- CreateIndex
CREATE INDEX "Order_symbol_status_idx" ON "Order"("symbol", "status");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_positionId_idx" ON "Transaction"("positionId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarginAccount" ADD CONSTRAINT "MarginAccount_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowedAsset" ADD CONSTRAINT "BorrowedAsset_marginAccountId_fkey" FOREIGN KEY ("marginAccountId") REFERENCES "MarginAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bot" ADD CONSTRAINT "Bot_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
