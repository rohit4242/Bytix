"use client"

import Link from "next/link"
import { ShieldAlert, LogOut, Home } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

export default function UnauthorizedPage() {
    const router = useRouter()

    const handleSignOut = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/sign-in")
                    router.refresh()
                },
            },
        })
    }

    return (
        <div className="flex flex-col items-center justify-center  p-4 sm:p-8">
            <div className="relative w-full max-w-md">
                {/* Decorative background element */}
                <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-destructive/5 blur-3xl" />

                <Card className="relative border-2 border-destructive/20 shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-inner">
                            <ShieldAlert className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                            Access Denied
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            You don't have permission to access this resource.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-center">
                        <div className="rounded-lg bg-muted/50 p-6">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                This page requires elevated privileges or a different user role than the one currently assigned to your account. If you believe this is an error, please contact your administrator.
                            </p>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 pt-4 sm:flex-row">
                        <Button
                            variant="outline"
                            className="w-full sm:flex-1 gap-2 transition-all hover:bg-muted"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                        <Button asChild className="w-full sm:flex-1 gap-2 transition-all hover:scale-[1.02]">
                            <Link href="/">
                                <Home className="h-4 w-4" />
                                Return Home
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Branding/Footer */}
                <p className="mt-8 text-center text-xs font-medium tracking-widest text-muted-foreground/40 uppercase">
                    Bytix AI Security
                </p>
            </div>
        </div>
    )
}
