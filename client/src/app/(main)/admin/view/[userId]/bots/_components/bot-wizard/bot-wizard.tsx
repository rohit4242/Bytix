"use client"

import { useState, useEffect } from "react"
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"
import { StepIndicator } from "./step-indicator"
import { StepBotConfig } from "./step-bot-config"
import { StepTradeSetup } from "./step-trade-setup"
import { StepReview } from "./step-review"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { botWizardSchema, type BotWizardValues } from "./schema"
import { Form } from "@/components/ui/form"
import {
    type BackendTradeData,
} from "@/lib/bot-utils"
import { getExchangeConstraints } from "@/app/actions/bots"
import { X, TrendingUp } from "lucide-react"
import { PriceTicker } from "@/components/trading/price-ticker"
import { SanitizedExchange } from "@/app/actions/exchanges"
import { TradeType, OrderType, SideEffectType } from "@/generated/prisma"

const STEPS = [
    { label: "Details", description: "Configure bot identity and target market" },
    { label: "Trade", description: "Set trade amount and validate" },
    { label: "Review", description: "Risk assessment and confirmation" },
]

interface BotWizardProps {
    onClose?: () => void
    onComplete?: (data: any) => void
    exchanges: SanitizedExchange[]
    isLoading?: boolean
    initialData?: any
}

export function BotWizard({ onClose, onComplete, exchanges, isLoading, initialData }: BotWizardProps) {
    const [step, setStep] = useState(1)

    // Initialize form with real data schema
    const form = useForm<BotWizardValues>({
        resolver: zodResolver(botWizardSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            exchangeId: initialData?.exchangeId || (exchanges.length > 0 ? exchanges[0].id : ""),
            symbol: initialData?.symbol || (initialData?.pairs?.[0] || ""),
            orderType: initialData?.orderType || OrderType.MARKET,
            tradeType: initialData?.tradeType || TradeType.SPOT,
            tradeAmount: initialData?.tradeAmount ? Number(initialData.tradeAmount) : 100,
            amountUnit: initialData?.amountUnit || "quote",
            leverage: initialData?.leverage || 1,
            sideEffect: initialData?.sideEffect || SideEffectType.NO_SIDE_EFFECT,
            tpPercent: initialData?.tpPercent ? Number(initialData.tpPercent) : null,
            slPercent: initialData?.slPercent ? Number(initialData.slPercent) : null,
        }
    })

    const values = form.watch()


    const [backendData, setBackendData] = useState<any>(null)
    const [loadingData, setLoadingData] = useState(false)

    // Fetch backend data when config changes
    useEffect(() => {
        const { exchangeId, symbol } = values
        if (!exchangeId || !symbol) {
            setBackendData(null)
            return
        }

        let isMounted = true
        setLoadingData(true)

        getExchangeConstraints(exchangeId, symbol).then((data) => {
            if (isMounted && data) {
                setBackendData(data)
            }
            if (isMounted) setLoadingData(false)
        }).catch((err) => {
            console.error("Failed to fetch constraints:", err)
            if (isMounted) setLoadingData(false)
        })

        return () => { isMounted = false }
    }, [values.exchangeId, values.symbol])

    return (
        <Card className="w-full border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-border mb-6">
                <div className="flex w-full items-center justify-between">
                    <StepIndicator currentStep={step} steps={STEPS} />
                    <div className="flex items-center gap-3 ml-4">
                        {values.symbol && (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1">
                                <TrendingUp className="h-3 w-3 text-primary" />
                                <PriceTicker
                                    symbol={values.symbol}
                                    initialPrice={backendData?.price}
                                    className="text-[11px] font-medium text-primary"
                                />
                            </div>
                        )}

                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((values) => onComplete?.(values))}>
                        {step === 1 && (
                            <StepBotConfig
                                exchanges={exchanges}
                                onNext={() => setStep(2)}
                            />
                        )}
                        {step === 2 && (
                            <StepTradeSetup
                                backendData={backendData}
                                loading={loadingData}
                                onBack={() => setStep(1)}
                                onNext={() => setStep(3)}
                            />
                        )}
                        {step === 3 && (
                            <StepReview
                                backendData={backendData}
                                exchanges={exchanges}
                                onBack={() => setStep(2)}
                                onConfirm={() => { }} // Reliance on type="submit" in StepReview button
                                isLoading={isLoading}
                                initialData={initialData}
                            />
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
