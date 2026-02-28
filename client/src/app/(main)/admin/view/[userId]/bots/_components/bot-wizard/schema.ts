import * as z from "zod"
import { TradeType, OrderType, SideEffectType } from "@/generated/prisma"

export const botWizardSchema = z.object({
    // Step 1: Identity & Market
    name: z.string().min(1, "Bot name is required"),
    description: z.string().optional().nullable(),
    exchangeId: z.string().min(1, "Exchange is required"),
    symbol: z.string().min(1, "Trading pair is required"),
    orderType: z.nativeEnum(OrderType),
    tradeType: z.nativeEnum(TradeType),

    // Step 2: Trade Settings
    tradeAmount: z.number().positive("Amount must be greater than 0"),
    amountUnit: z.enum(["quote", "base"]),
    leverage: z.number().min(1).max(10),
    sideEffect: z.nativeEnum(SideEffectType),

    slPercent: z.number().nullable().optional(),
    tpPercent: z.number().nullable().optional(),
    quantity: z.number().optional().nullable(),
})

export type BotWizardValues = z.infer<typeof botWizardSchema>
