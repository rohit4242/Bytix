"use client"

import { useRouter } from "next/navigation"
import { Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminBannerProps {
    user: {
        id: string
        name: string | null
        role: string
    }
}

export function AdminBanner({ user }: AdminBannerProps) {
    const router = useRouter()

    const handleClear = () => {
        router.push("/admin/users")
    }

    return (
        <div className="bg-primary/10 border border-primary/20 rounded-lg py-2.5 px-4 flex items-center justify-between shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                    <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                            ADMIN VIEWING CONTEXT
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-primary text-primary-foreground uppercase tracking-tight">
                            LIVE
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                        Currently acting as <span className="text-foreground font-bold">{user.name ?? "Anonymous User"}</span> ({user.role})
                    </span>
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 gap-2 hover:bg-primary/20 hover:text-primary transition-all pr-3"
            >
                <div className="h-5 w-5 rounded bg-muted flex items-center justify-center">
                    <X className="h-3 w-3" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Exit Context</span>
            </Button>
        </div>
    )
}
