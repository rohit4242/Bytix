import { WebSocket } from "ws";
import { db } from "../lib/db";
import { Decimal } from "../generated/prisma/runtime/client";

export interface ActivePosition {
    id: string;
    symbol: string;
    side: "LONG" | "SHORT";
    tpPrice: number | null;
    slPrice: number | null;
    userId: string;
}

export type TargetHitCallback = (pos: ActivePosition, type: "TP" | "SL", price: number) => Promise<void>;

export class PriceMonitor {
    private static instance: PriceMonitor;
    private ws: WebSocket | null = null;
    private watchedSymbols: Set<string> = new Set();
    private positions: Map<string, ActivePosition> = new Map(); // positionId -> ActivePosition
    private isInitializing = false;
    public onTargetHit: TargetHitCallback | null = null;

    private constructor() { }

    public static getInstance(): PriceMonitor {
        if (!PriceMonitor.instance) {
            PriceMonitor.instance = new PriceMonitor();
        }
        return PriceMonitor.instance;
    }

    /**
     * Initialize monitor with all currently open positions
     */
    public async init() {
        if (this.isInitializing) return;
        this.isInitializing = true;

        console.log("[PriceMonitor] Initializing...");

        try {
            const openPositions = await db.position.findMany({
                where: { status: "OPEN" },
            });

            for (const pos of openPositions) {
                this.addPosition(pos as any);
            }

            if (this.watchedSymbols.size > 0) {
                this.connect();
            }
        } catch (err) {
            console.error("[PriceMonitor] Init failed:", err);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Add or update a position in the monitor
     */
    public addPosition(pos: { id: string; symbol: string; side: string; tpPrice: Decimal | null; slPrice: Decimal | null; userId: string }) {
        this.positions.set(pos.id, {
            id: pos.id,
            symbol: pos.symbol,
            side: pos.side as any,
            tpPrice: pos.tpPrice ? pos.tpPrice.toNumber() : null,
            slPrice: pos.slPrice ? pos.slPrice.toNumber() : null,
            userId: pos.userId
        });

        if (!this.watchedSymbols.has(pos.symbol)) {
            this.watchedSymbols.add(pos.symbol);
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.subscribe(pos.symbol);
            } else {
                this.connect();
            }
        }
    }

    /**
     * Remove a position from the monitor
     */
    public removePosition(positionId: string) {
        const pos = this.positions.get(positionId);
        if (!pos) return;

        this.positions.delete(positionId);

        // If no more positions for this symbol, unsubscribe
        const stillWatching = Array.from(this.positions.values()).some(p => p.symbol === pos.symbol);
        if (!stillWatching) {
            this.watchedSymbols.delete(pos.symbol);
            this.unsubscribe(pos.symbol);
        }
    }

    private connectDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    private connect() {
        if (this.connectDebounceTimer) clearTimeout(this.connectDebounceTimer);

        this.connectDebounceTimer = setTimeout(() => {
            if (this.ws) {
                this.ws.removeAllListeners();
                this.ws.terminate();
            }

            if (this.watchedSymbols.size === 0) return;

            const streams = Array.from(this.watchedSymbols)
                .map(s => `${s.toLowerCase()}@aggTrade`)
                .join("/");

            const url = `wss://stream.binance.com:9443/ws/${streams}`;

            console.log(`[PriceMonitor] Connecting to ${url}`);

            this.ws = new WebSocket(url);

            this.ws.on("open", () => {
                console.log("[PriceMonitor] WebSocket connected");
            });

            this.ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.e === "aggTrade") {
                        this.checkTargets(msg.s, parseFloat(msg.p));
                    }
                } catch (err) {
                    console.error("[PriceMonitor] Error parsing message:", err);
                }
            });

            this.ws.on("error", (err) => {
                console.error("[PriceMonitor] WebSocket error:", err);
            });

            this.ws.on("close", () => {
                if (this.watchedSymbols.size > 0) {
                    console.log("[PriceMonitor] WebSocket closed, reconnecting in 5s...");
                    setTimeout(() => this.connect(), 5000);
                }
            });
        }, 50); // 50ms debounce to batch subscriptions
    }

    private subscribe(symbol: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const payload = {
                method: "SUBSCRIBE",
                params: [`${symbol.toLowerCase()}@aggTrade`],
                id: Date.now()
            };
            this.ws.send(JSON.stringify(payload));
        }
    }

    private unsubscribe(symbol: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const payload = {
                method: "UNSUBSCRIBE",
                params: [`${symbol.toLowerCase()}@aggTrade`],
                id: Date.now()
            };
            this.ws.send(JSON.stringify(payload));
        }
    }

    private checkTargets(symbol: string, currentPrice: number) {
        for (const pos of this.positions.values()) {
            if (pos.symbol !== symbol) continue;

            let hit = false;
            let type: "TP" | "SL" = "TP";

            if (pos.side === "LONG") {
                if (pos.tpPrice && currentPrice >= pos.tpPrice) {
                    hit = true;
                    type = "TP";
                } else if (pos.slPrice && currentPrice <= pos.slPrice) {
                    hit = true;
                    type = "SL";
                }
            } else {
                // SHORT
                if (pos.tpPrice && currentPrice <= pos.tpPrice) {
                    hit = true;
                    type = "TP";
                } else if (pos.slPrice && currentPrice >= pos.slPrice) {
                    hit = true;
                    type = "SL";
                }
            }

            if (hit) {
                console.log(`[PriceMonitor] ${type} HIT for ${symbol} at ${currentPrice} (Target: ${type === "TP" ? pos.tpPrice : pos.slPrice})`);
                this.triggerClose(pos, type, currentPrice);
            }
        }
    }

    private async triggerClose(pos: ActivePosition, type: "TP" | "SL", price: number) {
        // Remove from monitor immediately to avoid double trigger
        this.removePosition(pos.id);

        if (this.onTargetHit) {
            this.onTargetHit(pos, type, price).catch(err => {
                console.error(`[PriceMonitor] Error in onTargetHit callback for ${pos.id}:`, err);
            });
        }
    }
}

export const priceMonitor = PriceMonitor.getInstance();
