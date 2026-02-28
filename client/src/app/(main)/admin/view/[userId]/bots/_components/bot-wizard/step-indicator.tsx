"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepIndicatorProps {
    currentStep: number
    steps: { label: string; description: string }[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
    return (
        <div className="flex items-center gap-3">
            {steps.map((step, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                const isCompleted = stepNumber < currentStep

                return (
                    <div key={step.label} className="flex items-center gap-3">
                        {index > 0 && (
                            <div
                                className={cn(
                                    "h-px w-8",
                                    isCompleted ? "bg-primary" : "bg-border"
                                )}
                            />
                        )}
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                    isActive &&
                                    "bg-primary text-primary-foreground",
                                    isCompleted &&
                                    "bg-primary/20 text-primary",
                                    !isActive &&
                                    !isCompleted &&
                                    "bg-secondary text-muted-foreground"
                                )}
                            >
                                {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNumber}
                            </div>
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
