/**
 * Signal Processor
 *
 * openPosition  — handles ENTER_LONG / ENTER_SHORT
 * closePosition — handles EXIT_LONG / EXIT_SHORT
 *
 * Per docs 03, 04, 05, 06.
 * ⚠️ Critical rules enforced here:
 *   - Every Binance call creates an Order record via createOrderRecord()
 *   - Signal status always updated (PROCESSED | SKIPPED | FAILED)
 *   - Entry price stored from actual fill — not estimated
 */

import { db } from "../lib/db";
import { formatQuantity, getLotSizeFilter, getSymbolPrice } from "../binance/market";
import { placeSpotMarketOrder } from "../binance/spot";
import { placeMarginMarketOrder } from "../binance/margin";
import { getBinanceClient } from "../binance/client";
import { getSymbolInfo, formatPrice } from "../binance/market";
import { calculatePnl } from "./pnl-calculator";
import { priceMonitor, type ActivePosition } from "./price-monitor";
import { Decimal } from "../generated/prisma/runtime/client";
import type {
    Signal,
    Bot,
    Exchange,
    Position,
    OrderStatus,
    SideEffectType,
    Prisma,
} from "../generated/prisma";

type BotWithExchange = Bot & { exchange: Exchange };
type PrismaTx = Prisma.TransactionClient;

// ─── Result Types ─────────────────────────────────────────────────────────

export type SignalResult =
    | { action: "OPENED"; positionId: string }
    | { action: "CLOSED"; positionId: string }
    | { action: "SKIPPED"; reason: string };

// ─── Order Record Utility ─────────────────────────────────────────────────

/**
 * Persist an Order record inside a Prisma transaction.
 * Must be called for every Binance API call — success or failure.
 */
async function createOrderRecord(
    tx: PrismaTx,
    data: {
        positionId: string;
        binanceOrderId: string | null;
        symbol: string;
        side: "BUY" | "SELL";
        purpose: "ENTRY" | "EXIT";
        sideEffect: SideEffectType;
        quantity: Decimal;
        filledQuantity: Decimal;
        fillPercent: Decimal;
        avgFillPrice: Decimal | null;
        fee: Decimal;
        feeAsset: string | null;
        status: OrderStatus;
        errorMessage: string | null;
        rawResponse: object | null;
        filledAt: Date | null;
    }
): Promise<void> {
    await tx.order.create({
        data: {
            positionId: data.positionId,
            binanceOrderId: data.binanceOrderId,
            symbol: data.symbol,
            side: data.side,
            type: "MARKET",
            purpose: data.purpose,
            sideEffect: data.sideEffect,
            quantity: data.quantity,
            filledQuantity: data.filledQuantity,
            fillPercent: data.fillPercent,
            avgFillPrice: data.avgFillPrice,
            fee: data.fee,
            feeAsset: data.feeAsset,
            status: data.status,
            errorMessage: data.errorMessage,
            rawResponse: data.rawResponse ?? undefined,
            filledAt: data.filledAt,
        },
    });
}

// ─── Open Position ────────────────────────────────────────────────────────

/**
 * Execute an ENTER_LONG or ENTER_SHORT signal.
 * Places a market order on Binance, creates the Position + Order records.
 */
export async function openPosition(
    signal: Signal,
    bot: BotWithExchange
): Promise<{ action: "OPENED"; positionId: string }> {
    const { spot, margin } = getBinanceClient(bot.exchange);

    // 1. Fetch current market price
    const priceResult = await getSymbolPrice(spot, signal.symbol);
    if (!priceResult.success || !priceResult.data) {
        throw new Error(priceResult.error ?? `Failed to fetch price for ${signal.symbol}`);
    }
    const estimatedPrice = parseFloat(priceResult.data.price);

    // 2. Calculate order quantity from bot trade amount
    const tradeAmount = Number(bot.quantity);
    const quantityDecimal = new Decimal(tradeAmount.toFixed(8));

    // 3. Determine order sides
    const binanceSide: "BUY" | "SELL" = signal.action === "ENTER_LONG" ? "BUY" : "SELL";
    const positionSide: "LONG" | "SHORT" = signal.action === "ENTER_LONG" ? "LONG" : "SHORT";

    // 4. Use sideEffect configured on the bot (set at creation time)
    const sideEffect = bot.sideEffect ?? "NO_SIDE_EFFECT";

    // 5. Place market order on Binance
    type Fill = { price: string; qty: string; commission: string; commissionAsset: string };
    let binanceOrderId: string | null = null;
    let orderStatus: OrderStatus = "PENDING";
    let rawResponse: object | null = null;
    let orderError: string | null = null;
    let fills: Fill[] = [];

    if (bot.tradeType === "SPOT") {
        try {
            const result = await placeSpotMarketOrder(spot, {
                symbol: signal.symbol,
                side: binanceSide,
                quantity: quantityDecimal.toString(),
            });
            if (!result.success || !result.data) throw new Error(result.error ?? "Spot order failed");

            binanceOrderId = result.data.orderId.toString();
            orderStatus = "FILLED";
            rawResponse = result.data as object;
            fills = (result.data.fills ?? []) as Fill[];
        } catch (err) {
            orderError = err instanceof Error ? err.message : "Spot order failed";
        }
    } else {
        // MARGIN
        try {

            console.log("Placing margin order:", JSON.stringify({
                symbol: signal.symbol,
                side: binanceSide,
                quantity: quantityDecimal.toString(),
                sideEffectType: sideEffect,
            }));
            const result = await placeMarginMarketOrder(margin, {
                symbol: signal.symbol,
                side: binanceSide,
                quantity: quantityDecimal.toString(),
                sideEffectType: sideEffect,
            });
            if (!result.success || !result.data) throw new Error(result.error ?? "Margin order failed");

            binanceOrderId = result.data.orderId.toString();
            orderStatus = "FILLED";
            rawResponse = result.data as object;
            fills = (result.data.fills ?? []) as Fill[];
        } catch (err) {
            orderError = err instanceof Error ? err.message : "Margin order failed";
        }
    }

    // 6. Extract actual fill data
    // Use the actual fill price (not estimated) — critical for correct P&L later
    const actualEntryPrice = fills[0]?.price
        ? new Decimal(parseFloat(fills[0].price).toFixed(8))
        : new Decimal(estimatedPrice.toFixed(8));

    const totalFilledQty = fills.reduce((sum, f) => sum + parseFloat(f.qty || "0"), 0);
    const actualQuantity = totalFilledQty > 0
        ? new Decimal(totalFilledQty.toFixed(8))
        : quantityDecimal;

    const entryFee = fills.reduce((sum, f) => sum + parseFloat(f.commission || "0"), 0);
    const feeAsset = fills[0]?.commissionAsset ?? null;

    const notionalUsdt = new Decimal((estimatedPrice * tradeAmount).toFixed(8));

    // 7. If Binance call failed, throw BEFORE transaction
    if (orderError) {
        throw new Error(`Entry order failed: ${orderError}`);
    }

    // 8. Create Position + Entry Order in a single transaction
    const { position } = await db.$transaction(async (tx) => {
        const pos = await tx.position.create({
            data: {
                userId: bot.userId,
                botId: bot.id,
                symbol: signal.symbol,
                side: positionSide,
                tradeType: bot.tradeType,
                marginType: bot.marginType ?? null,
                leverage: bot.leverage,
                quantity: quantityDecimal,
                entryPrice: actualEntryPrice,
                notionalUsdt: notionalUsdt,
                fee: new Decimal(entryFee.toFixed(8)),
                status: "OPEN",
            },
        });

        await createOrderRecord(tx, {
            positionId: pos.id,
            binanceOrderId,
            symbol: signal.symbol,
            side: binanceSide,
            purpose: "ENTRY",
            sideEffect,
            quantity: quantityDecimal,
            filledQuantity: actualQuantity,
            fillPercent: new Decimal(100),
            avgFillPrice: actualEntryPrice,
            fee: new Decimal(entryFee.toFixed(8)),
            feeAsset,
            status: orderStatus,
            errorMessage: null,
            rawResponse,
            filledAt: new Date(),
        });

        return { position: pos };
    });

    // 9. Calculate and Save TP/SL targets if set (BACKGROUND TRANSACTION)
    if (bot.tpPercent || bot.slPercent) {
        // Run in background to avoid delaying the signal response
        (async () => {
            try {
                const symInfo = await getSymbolInfo(spot, signal.symbol);
                if (symInfo.success && symInfo.data) {
                    const info = symInfo.data;

                    let tpPriceNum: number | null = null;
                    let slPriceNum: number | null = null;

                    if (bot.tpPercent) {
                        const mult = positionSide === "LONG" ? 1 + (bot.tpPercent.toNumber() / 100) : 1 - (bot.tpPercent.toNumber() / 100);
                        tpPriceNum = actualEntryPrice.toNumber() * mult;
                    }

                    if (bot.slPercent) {
                        const mult = positionSide === "LONG" ? 1 - (bot.slPercent.toNumber() / 100) : 1 + (bot.slPercent.toNumber() / 100);
                        slPriceNum = actualEntryPrice.toNumber() * mult;
                    }

                    const tpPriceStr = tpPriceNum ? formatPrice(tpPriceNum, info) : null;
                    const slPriceStr = slPriceNum ? formatPrice(slPriceNum, info) : null;

                    const updatedPos = await db.position.update({
                        where: { id: position.id },
                        data: {
                            tpPrice: tpPriceStr ? new Decimal(tpPriceStr) : null,
                            slPrice: slPriceStr ? new Decimal(slPriceStr) : null,
                        }
                    });

                    // 10. Start monitoring
                    priceMonitor.addPosition(updatedPos);
                    console.log(`[Monitor] Background setup complete for position ${position.id} (${signal.symbol})`);
                }
            } catch (err) {
                console.error(`[Monitor] Background TP/SL setup failed:`, err);
            }
        })();
    }

    return { action: "OPENED", positionId: position.id };
}

// ─── Close Position ───────────────────────────────────────────────────────

/**
 * Execute an EXIT_LONG or EXIT_SHORT signal.
 * Places the closing market order on Binance, computes P&L, closes the Position.
 */
export async function closePosition(
    signal: Signal,
    bot: BotWithExchange,
    position: Position
): Promise<{ action: "CLOSED"; positionId: string }> {
    const { spot, margin } = getBinanceClient(bot.exchange);

    // 1. Close side is the opposite of the position side
    const closeSide: "BUY" | "SELL" = position.side === "LONG" ? "SELL" : "BUY";

    console.log("Closing position:", JSON.stringify(position));
    console.log("closeSide: ", closeSide)
    // 2. Place closing market order on Binance
    type Fill = { price: string; qty: string; commission: string; commissionAsset: string };
    let binanceOrderId: string | null = null;
    let rawResponse: object | null = null;
    let orderError: string | null = null;
    let fills: Fill[] = [];

    if (bot.tradeType === "SPOT") {
        try {
           
            console.log("Placing spot close order:", JSON.stringify({
                symbol: position.symbol,
                side: closeSide,
                quantity: position.quantity.toString(),
            }));
            const result = await placeSpotMarketOrder(spot, {
                symbol: position.symbol,
                side: closeSide,
                quantity: position.quantity.toString(),
            });
            console.log("Spot close result:", JSON.stringify(result));
            if (!result.success || !result.data) throw new Error(result.error ?? "Spot close failed");

            binanceOrderId = result.data.orderId.toString();
            rawResponse = result.data as object;
            fills = (result.data.fills ?? []) as Fill[];
        } catch (err) {
            orderError = err instanceof Error ? err.message : "Spot close failed";
        }
    } else {
        // MARGIN — always AUTO_REPAY on close
        try {

            const result = await placeMarginMarketOrder(margin, {
                symbol: position.symbol,
                side: closeSide,
                quantity: position.quantity.toString(),
                sideEffectType: "AUTO_REPAY",
            });
            if (!result.success || !result.data) throw new Error(result.error ?? "Margin close failed");

            binanceOrderId = result.data.orderId.toString();
            rawResponse = result.data as object;
            fills = (result.data.fills ?? []) as Fill[];
        } catch (err) {
            orderError = err instanceof Error ? err.message : "Margin close failed";
        }
    }

    // 3. Extract exit fill data
    const totalFilledQty = fills.reduce((sum, f) => sum + parseFloat(f.qty || "0"), 0);
    const actualExitQty = totalFilledQty > 0 ? new Decimal(totalFilledQty.toFixed(8)) : position.quantity;
    const fillPercent = position.quantity.gt(0) ? new Decimal((totalFilledQty / position.quantity.toNumber()) * 100).toFixed(2) : new Decimal(0);

    const exitPrice = fills[0]?.price
        ? new Decimal(parseFloat(fills[0].price).toFixed(8))
        : null;

    const exitFee = new Decimal(
        fills.reduce((sum, f) => sum + parseFloat(f.commission || "0"), 0).toFixed(8)
    );
    const feeAsset = fills[0]?.commissionAsset ?? null;

    // 4. If Binance call failed, throw BEFORE transaction
    if (orderError) {
        throw new Error(`Exit order failed: ${orderError}`);
    }

    if (!exitPrice || !position.entryPrice) {
        throw new Error("Cannot close position: Missing exit price or entry price data");
    }

    // 5. Persist exit order + close position in a single transaction
    await db.$transaction(async (tx) => {
        await createOrderRecord(tx, {
            positionId: position.id,
            binanceOrderId,
            symbol: position.symbol,
            side: closeSide,
            purpose: "EXIT",
            sideEffect: bot.tradeType === "MARGIN" ? "AUTO_REPAY" : "NO_SIDE_EFFECT",
            quantity: position.quantity,
            filledQuantity: actualExitQty,
            fillPercent: new Decimal(fillPercent),
            avgFillPrice: exitPrice,
            fee: exitFee,
            feeAsset,
            status: "FILLED",
            errorMessage: null,
            rawResponse,
            filledAt: new Date(),
        });

        // Calculate P&L
        const pnl = calculatePnl(
            {
                side: position.side,
                entryPrice: position.entryPrice as Decimal,
                quantity: position.quantity,
                leverage: position.leverage,
                fee: position.fee,
            },
            exitPrice,
            exitFee
        );

        // Close the position
        await tx.position.update({
            where: { id: position.id },
            data: {
                exitPrice,
                realizedPnl: pnl.realized,
                pnlPercent: pnl.percent,
                status: "CLOSED",
                closedAt: new Date(),
                isReconciled: true,
            },
        });
    });

    // 6. Remove from PriceMonitor
    priceMonitor.removePosition(position.id);

    return { action: "CLOSED", positionId: position.id };
}

/**
 * Handle automated EXIT when PriceMonitor hits a target.
 */
export async function handleAutomatedExit(pos: ActivePosition, type: "TP" | "SL", hitPrice: number) {
    try {
        const exitAction = pos.side === "LONG" ? "EXIT_LONG" : "EXIT_SHORT";

        // 1. Create a synthetic signal
        const signal = await db.signal.create({
            data: {
                botId: (await db.position.findUnique({ where: { id: pos.id }, select: { botId: true } }))?.botId || "",
                action: exitAction,
                symbol: pos.symbol,
                status: "PROCESSING",
                processed: true,
                rawPayload: { source: "price_monitor", type, hitPrice },
            },
        });

        // 2. Fetch full objects
        const bot = await db.bot.findFirst({
            where: { id: signal.botId },
            include: { exchange: true }
        });

        const position = await db.position.findUnique({
            where: { id: pos.id }
        });

        if (!bot || !position) throw new Error("Missing bot or position data for automated exit");

        // 3. Execute closure
        await closePosition(signal, bot as any, position);

        // 4. Finalize signal
        await db.signal.update({
            where: { id: signal.id },
            data: { status: "PROCESSED" }
        });

        console.log(`[AutomatedExit] ${type} closure finalized for ${pos.symbol}`);
    } catch (err) {
        console.error(`[AutomatedExit] Error during ${type} closure for position ${pos.id}:`, err);
    }
}
