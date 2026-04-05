"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { roleRedirectURL } from "@/lib/constants"
import { authClient } from "@/lib/auth-client"

export default function AuthCallback() {
  const router = useRouter()

  const { data: session, refetch, error, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending) return

    if (!session?.user) {
      router.replace("/sign-in")
      return
    }

    // Role based redirect using the role from session
    const rawRole = (session.user as unknown as { role: string }).role || ""
    const userRole = rawRole.toUpperCase()
    
    if (userRole && userRole in roleRedirectURL) {
      router.replace(roleRedirectURL[userRole as keyof typeof roleRedirectURL])
    } else {
      // Fallback to unauthorized if role is unknown
      router.replace("/unauthorized")
    }
  }, [session, isPending, router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-destructive">{error.message}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  )
}

