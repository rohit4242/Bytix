/**
 * Signal Pipeline
 *
 * Orchestrates the full webhook → signal → execution flow.
 * Each stage is a named function with a clear single responsibility.
 *
 * Stage order:
 *   1. loadAndValidateBot   — bot exists, ACTIVE, secret matches, symbol in pairs
 *   2. recordSignal         — always create Signal record (audit trail)
 *   3. claimSignal          — atomic idempotency lock
 *   4. resolveSignalAction  — decision table: OPEN / CLOSE / SKIP
 *   5. openPosition /       — Binance execution (in signal-processor.ts)
 *      closePosition
 *   6. updateSignalStatus   — PROCESSED | SKIPPED | FAILED
 *
 * Always returns 200 — never throws out to the route.
 * Per docs 03, 04.
 */

import { db } from "../lib/db";
import { openPosition, closePosition } from "./signal-processor";
import type { WebhookPayload } from "../validation/signal.schema";
import type { Bot, Signal, Position, SignalAction } from "../generated/prisma";

// ─── Public Result Type ───────────────────────────────────────────────────

export type PipelineResult =
    | { success: true; signalId: string; action: "OPENED" | "CLOSED"; positionId: string }
    | { success: true; signalId: string; action: "SKIPPED"; reason: string }
    | { success: false; signalId?: string; error: string; skipped?: boolean; reason?: string };

// ─── Entry Point ──────────────────────────────────────────────────────────

export async function runWebhookPipeline(
    botId: string,
    payload: WebhookPayload
): Promise<PipelineResult> {
    // Stage 1 — Load and validate bot
    const botResult = await loadAndValidateBot(botId, payload);
    if (!botResult.ok) {
        return { success: false, error: botResult.error };
    }
    const bot = botResult.bot;

    // Stage 2 — Record signal (always — this is the audit trail)
    const signal = await recordSignal(bot.id, payload);

    // Stage 3 — Claim signal (idempotency lock)
    const claimed = await claimSignal(signal.id);
    if (!claimed) {
        return {
            success: false,
            skipped: true,
            signalId: signal.id,
            reason: "Signal already being processed",
            error: "Signal already being processed",
        };
    }

    // Stage 4 — Resolve what action to take
    const decision = await resolveSignalAction(signal, bot);

    if (decision.action === "SKIP") {
        await updateSignalStatus(signal.id, "SKIPPED", { reason: decision.reason });
        return { success: true, signalId: signal.id, action: "SKIPPED", reason: decision.reason };
    }

    // Stage 5 — Execute (open or close position)
    try {
        const botWithExchange = await db.bot.findUniqueOrThrow({
            where: { id: bot.id },
            include: { exchange: true },
        });

        let result: { action: "OPENED" | "CLOSED"; positionId: string };

        if (decision.action === "OPEN") {
            result = await openPosition(signal, botWithExchange);
        } else {
            result = await closePosition(signal, botWithExchange, decision.position);
        }

        // Stage 6 — Mark signal processed
        await updateSignalStatus(signal.id, "PROCESSED", { positionId: result.positionId });

        return {
            success: true,
            signalId: signal.id,
            action: result.action,
            positionId: result.positionId,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Signal processing failed";
        console.error(`[Pipeline] Signal ${signal.id} failed:`, msg);
        await updateSignalStatus(signal.id, "FAILED", { errorMessage: msg });
        return { success: false, signalId: signal.id, error: msg };
    }
}

// ─── Stage 1: Load and Validate Bot ──────────────────────────────────────

type BotGuardOk = { ok: true; bot: Bot };
type BotGuardFail = { ok: false; error: string };

async function loadAndValidateBot(
    botId: string,
    payload: WebhookPayload
): Promise<BotGuardOk | BotGuardFail> {
    const bot = await db.bot.findUnique({
        where: { id: botId },
    });

    if (!bot) {
        return { ok: false, error: "Bot not found" };
    }

    if (bot.status !== "ACTIVE") {
        return { ok: false, error: `Bot is not active (status: ${bot.status})` };
    }

    if (!bot.webhookSecret || payload.secret !== bot.webhookSecret) {
        return { ok: false, error: "Invalid webhook secret" };
    }

    if (!bot.pairs.includes(payload.symbol)) {
        return { ok: false, error: `Symbol ${payload.symbol} is not configured for this bot` };
    }

    return { ok: true, bot };
}

// ─── Stage 2: Record Signal ───────────────────────────────────────────────

async function recordSignal(botId: string, payload: WebhookPayload): Promise<Signal> {
    return db.signal.create({
        data: {
            botId,
            action: payload.action,
            symbol: payload.symbol,
            status: "PENDING",
            processed: false,
            rawPayload: payload as object,
        },
    });
}

// ─── Stage 3: Claim Signal (Idempotency Lock) ─────────────────────────────

/**
 * Atomically claim the signal. Returns false if another process already claimed it.
 */
async function claimSignal(signalId: string): Promise<boolean> {
    const result = await db.signal.updateMany({
        where: { id: signalId, processed: false },
        data: { processed: true, status: "PROCESSING" },
    });
    return result.count > 0;
}

// ─── Stage 4: Resolve Signal Action ──────────────────────────────────────

type DecisionOpen = { action: "OPEN" };
type DecisionClose = { action: "CLOSE"; position: Position };
type DecisionSkip = { action: "SKIP"; reason: string };
type Decision = DecisionOpen | DecisionClose | DecisionSkip;

async function resolveSignalAction(signal: Signal, bot: Bot): Promise<Decision> {
    const action = signal.action as SignalAction;

    const openPosition = await db.position.findFirst({
        where: { botId: bot.id, status: "OPEN" },
    });

    // No open position
    if (!openPosition) {
        if (action === "ENTER_LONG") return { action: "OPEN" };
        if (action === "ENTER_SHORT") {
            if (bot.tradeType === "SPOT") {
                return { action: "SKIP", reason: "SPOT bots cannot go SHORT" };
            }
            return { action: "OPEN" };
        }
        return { action: "SKIP", reason: "No open position to close" };
    }

    // Open position exists
    if (action === "EXIT_LONG" && openPosition.side === "LONG") {
        return { action: "CLOSE", position: openPosition };
    }
    if (action === "EXIT_SHORT" && openPosition.side === "SHORT") {
        return { action: "CLOSE", position: openPosition };
    }
    if (action === "ENTER_LONG" && openPosition.side === "LONG") {
        return { action: "SKIP", reason: "Already in LONG — strict mode, no re-entry" };
    }
    if (action === "ENTER_SHORT" && openPosition.side === "SHORT") {
        return { action: "SKIP", reason: "Already in SHORT — strict mode, no re-entry" };
    }
    if (action === "ENTER_LONG" || action === "ENTER_SHORT") {
        return { action: "SKIP", reason: "Must EXIT current position first — strict mode" };
    }

    return { action: "SKIP", reason: "Signal side does not match open position" };
}

// ─── Stage 6: Update Signal Status ───────────────────────────────────────

export async function updateSignalStatus(
    signalId: string,
    status: "PROCESSED" | "SKIPPED" | "FAILED",
    extras: {
        positionId?: string;
        reason?: string;
        errorMessage?: string;
    } = {}
): Promise<void> {
    await db.signal.update({
        where: { id: signalId },
        data: {
            status,
            processedAt: new Date(),
            positionId: extras.positionId ?? null,
            errorMessage: extras.errorMessage ?? extras.reason ?? null,
        },
    }).catch((err) => {
        console.error(`[Pipeline] Failed to update signal ${signalId} status:`, err);
    });
}
