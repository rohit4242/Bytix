import { IconBolt } from "@tabler/icons-react"
import { GalleryVerticalEnd } from "lucide-react"

import { SignUpForm } from "@/app/(auth)/_components/sign-up-form"
import { getUserSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { roleRedirectURL } from "@/lib/constants"

export default async function SignUpPage() {
  const session = await getUserSession()

  if (session?.user) {
    const userRole = (session.user as unknown as { role: string }).role
    if (userRole && userRole in roleRedirectURL) {
      redirect(roleRedirectURL[userRole as keyof typeof roleRedirectURL])
    } else {
      redirect(roleRedirectURL.CUSTOMER)
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <IconBolt className="size-4" />
          </div>
          Bytix
        </a>
        <SignUpForm />
      </div>
    </div>
  )
}
