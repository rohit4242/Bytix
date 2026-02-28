/**
 * Binance WebSocket — User Data Stream
 *
 * Handles real-time order fill events and balance updates for each active exchange.
 * startWebSocketManager() boots one stream per active exchange on server startup.
 */

import WebSocket from "ws";
import { db } from "../lib/db";
import { env } from "../lib/env";
import { mapBinanceStatus } from "./utils";
import { getBinanceClient } from "./client";
import { calculatePnl } from "../services/pnl-calculator";
import type { Exchange } from "../generated/prisma";
import { Decimal } from "../generated/prisma/runtime/client";

// ─── Types ────────────────────────────────────────────────────────────────

interface BinanceOrderUpdateEvent {
    e: "executionReport";
    i: number;   // orderId
    X: string;   // order status
    z: string;   // cumulative filled qty
    ap: string;  // average fill price
    n: string;   // commission
    N: string;   // commission asset
    l: string;   // last filled qty
    L: string;   // last fill price
}

interface BinanceStreamEvent {
    e: string;
    [key: string]: unknown;
}

// ─── Stream Class ─────────────────────────────────────────────────────────

export class BinanceUserDataStream {
    private ws: WebSocket | null = null;
    private listenKey = "";
    private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    constructor(private readonly exchange: Exchange) { }

    async start(): Promise<void> {
        this.stopped = false;
        try {
            this.listenKey = await this.createListenKey() || "";
            if (!this.listenKey) {
                console.warn(`[WS] Skipping exchange ${this.exchange.id} due to invalid credentials.`);
                return;
            }

            const wsUrl = `${env.BINANCE_WS_URL}/ws/${this.listenKey}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.on("message", (raw) => {
                try {
                    const event = JSON.parse(raw.toString()) as BinanceStreamEvent;
                    this.handleMessage(event).catch((err) =>
                        console.error(`[WS] handleMessage error:`, err)
                    );
                } catch {
                    // ignore parse errors
                }
            });

            this.ws.on("close", () => {
                if (!this.stopped) this.scheduleReconnect();
            });

            this.ws.on("error", (err) => {
                console.error(`[WS] Exchange ${this.exchange.id} error:`, err.message);
            });

            // Keep listen key alive — Binance expires it after 60 min without ping
            this.keepAliveTimer = setInterval(
                () => this.pingListenKey().catch(console.error),
                30 * 60 * 1000 // every 30 min
            );

            console.log(`[WS] Started user data stream for exchange ${this.exchange.id}`);
        } catch (err) {
            console.error(`[WS] Failed to initialize stream for exchange ${this.exchange.id}:`, err instanceof Error ? err.message : err);
        }
    }

    stop(): void {
        this.stopped = true;
        if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
    }

    private scheduleReconnect(): void {
        console.log(`[WS] Reconnecting exchange ${this.exchange.id} in 5s...`);
        this.reconnectTimer = setTimeout(() => this.start().catch(console.error), 5000);
    }

    private async handleMessage(event: BinanceStreamEvent): Promise<void> {
        if (event.e === "executionReport") {
            await this.handleOrderUpdate(event as unknown as BinanceOrderUpdateEvent);
        }
        // outboundAccountPosition ignored for now (balance updates come via margin sync job)
    }

    private async handleOrderUpdate(event: BinanceOrderUpdateEvent): Promise<void> {
        const binanceOrderId = event.i.toString();
        const newStatus = mapBinanceStatus(event.X);

        const order = await db.order.findFirst({
            where: { binanceOrderId },
            include: { position: true },
        });

        if (!order) {
            // Could be a manual order placed outside the bot
            console.warn(`[WS] Order not found in DB: binanceOrderId=${binanceOrderId}`);
            return;
        }

        const positionToClose = order.position;

        if (!positionToClose) return;

        await db.$transaction(async (tx) => {
            const filledQty = new Decimal(event.z || "0");
            const avgFillPrice = event.ap ? new Decimal(event.ap) : null;
            const fee = new Decimal(event.n || "0");
            const fillPercent = (positionToClose.quantity.gt(0))
                ? filledQty.div(positionToClose.quantity).mul(100)
                : new Decimal(0);

            // 1. Update order record if it exists
            if (order) {
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: newStatus,
                        filledQuantity: filledQty,
                        avgFillPrice,
                        fee,
                        feeAsset: event.N || null,
                        fillPercent,
                        filledAt: newStatus === "FILLED" ? new Date() : null,
                    },
                });
            }

            // 2. If ENTRY order filled → set entry price on position
            if (order?.purpose === "ENTRY" && newStatus === "FILLED" && avgFillPrice) {
                await tx.position.update({
                    where: { id: positionToClose.id },
                    data: { entryPrice: avgFillPrice, isReconciled: true, lastSyncAt: new Date() },
                });
            }

            // 3. If EXIT/SL/TP filled → close the position
            // OCO legs are always for exiting. If we matched via binanceOrderListId, it's an exit.
            const isExitFill = (order && ["EXIT", "STOP_LOSS", "TAKE_PROFIT"].includes(order.purpose));

            if (isExitFill && newStatus === "FILLED" && avgFillPrice) {
                const position = positionToClose;

                // Only process if position is still open
                if (position.status !== "OPEN" || !position.entryPrice) return;

                const pnl = calculatePnl(
                    {
                        side: position.side,
                        entryPrice: position.entryPrice,
                        quantity: position.quantity,
                        leverage: position.leverage,
                        fee: position.fee,
                    },
                    avgFillPrice,
                    fee
                );

                await tx.position.update({
                    where: { id: position.id },
                    data: {
                        exitPrice: avgFillPrice,
                        realizedPnl: pnl.realized,
                        pnlPercent: pnl.percent,
                        status: "CLOSED",
                        closedAt: new Date(),
                    },
                });
            }
        });
    }

    private async createListenKey(): Promise<string | null> {
        const apiKey = this.exchange.apiKey;
        const base = env.BINANCE_BASE_URL;

        // 1. Try Cross-Margin endpoint
        let resp = await fetch(`${base}/sapi/v1/userDataStream`, {
            method: "POST",
            headers: { "X-MBX-APIKEY": apiKey },
        });

        if (resp.ok) {
            const data = await resp.json() as { listenKey: string };
            return data.listenKey;
        }

        // Log Margin failure for debugging
        const marginError = await resp.text();
        if (resp.status === 400 || resp.status === 401) {
            console.warn(`[WS-DEBUG] Margin ListenToken failed (Permission?): ${resp.status} ${marginError}`);
        }

        // 2. Try Spot endpoint (Official /api/v3/userDataStream)
        resp = await fetch(`${base}/api/v3/userDataStream`, {
            method: "POST",
            headers: { "X-MBX-APIKEY": apiKey },
        });

        if (resp.ok) {
            const data = await resp.json() as { listenKey: string };
            return data.listenKey;
        }

        const spotError = await resp.text();
        console.warn(`[WS-DEBUG] Spot ListenToken failed: ${resp.status} ${spotError}`);

        // Handle specific codes (just log, don't deactivate)
        if (resp.status === 401 || resp.status === 410) {
            console.warn(`[WS] API keys for ${this.exchange.id} are invalid or expired (${resp.status})`);
            return null;
        }

        throw new Error(`Failed to create listenKey for ${this.exchange.id}`);
    }

    private async pingListenKey(): Promise<void> {
        const apiKey = this.exchange.apiKey;
        const base = env.BINANCE_BASE_URL;

        // Try Margin endpoint first
        let resp = await fetch(`${base}/sapi/v1/userDataStream?listenKey=${this.listenKey}`, {
            method: "PUT",
            headers: { "X-MBX-APIKEY": apiKey },
        });

        // Fallback to spot
        if (!resp.ok) {
            await fetch(`${base}/api/v3/userDataStream?listenKey=${this.listenKey}`, {
                method: "PUT",
                headers: { "X-MBX-APIKEY": apiKey },
            });
        }
    }
}

// ─── Manager ──────────────────────────────────────────────────────────────

const activeStreams = new Map<string, BinanceUserDataStream>();

/**
 * Boot one WebSocket user data stream for each active exchange.
 * Called once at server startup.
 */
export async function startWebSocketManager(): Promise<void> {
    try {
        const exchanges = await db.exchange.findMany({
            where: { isActive: true },
        });

        console.log(`[WS] Starting streams for ${exchanges.length} active exchange(s)...`);

        for (const exchange of exchanges) {
            if (!activeStreams.has(exchange.id)) {
                const stream = new BinanceUserDataStream(exchange);
                activeStreams.set(exchange.id, stream);
                stream.start().catch((err) =>
                    console.error(`[WS] Failed to start stream for exchange ${exchange.id}:`, err)
                );
            }
        }
    } catch (err) {
        console.error("[WS] startWebSocketManager failed:", err);
    }
}
