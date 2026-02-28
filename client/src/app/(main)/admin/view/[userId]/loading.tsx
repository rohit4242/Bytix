import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
            <div className="relative flex items-center justify-center">
                {/* Outer pulsing ring */}
                <div className="absolute h-12 w-12 rounded-full border-4 border-primary/20 animate-ping" />
                {/* Inner spinning loader */}
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium animate-pulse">Switching Context</p>
                <p className="text-[10px] text-muted-foreground">Preparing your view...</p>
            </div>
        </div>
    )
}
