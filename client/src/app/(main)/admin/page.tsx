import { Users, MousePointerClick } from "lucide-react"
import { ServerStatus } from "@/components/server-status"

export default function AdminPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 relative">
                <Users className="h-10 w-10 text-primary" />
                <div className="absolute -right-1 -bottom-1 bg-background p-1.5 rounded-full border shadow-sm">
                    <MousePointerClick className="h-4 w-4 text-primary animate-bounce" />
                </div>
            </div>

            <h2 className="text-2xl font-black tracking-tighter uppercase mb-2">
                Platform Administration
            </h2>

            <p className="max-w-[420px] text-muted-foreground font-medium text-sm leading-relaxed">
                Welcome to the Bytix Command Center. Please select a <span className="text-foreground font-bold italic">User or Agent</span> from the sidebar to inspect their portfolio, active bots, and trading performance.
            </p>

            <div className="mt-8">
                <ServerStatus className="bg-muted/50 border-border/50 hover:bg-muted" />
            </div>
        </div>
    )
}
