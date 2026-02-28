import { cn } from "@/lib/utils"

interface DangerBannerProps {
    message?: string
    className?: string
}

export function DangerBanner({
    message = "Your margin is at critical risk. Close positions immediately.",
    className,
}: DangerBannerProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400",
                className
            )}
            role="alert"
        >
            <span className="text-base">⚠</span>
            <span className="font-medium">{message}</span>
        </div>
    )
}
