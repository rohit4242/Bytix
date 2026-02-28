import { getUserSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { roleRedirectURL } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { IconBolt, IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

export default async function Home() {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white text-zinc-950 font-sans selection:bg-primary/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.06),transparent_50%)] pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center px-6 text-center animate-in fade-in zoom-in duration-1000">
        <div className="flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-primary shadow-[0_15px_40px_rgba(20,184,166,0.3)] mb-8 transition-all hover:scale-110 hover:-rotate-3 duration-500 cursor-default">
          <IconBolt className="h-10 w-10 text-white fill-white/10" strokeWidth={2.5} />
        </div>

        <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic leading-none mb-2 text-zinc-900 selection:bg-primary selection:text-white">
          Bytix
        </h1>

        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-zinc-400 mb-12 ml-4">
          Terminal Access Point
        </p>

        <div className="flex flex-col items-center gap-8 w-full max-w-[280px]">
          <Button asChild size="lg" className="h-16 w-full rounded-2xl text-lg font-black uppercase italic tracking-wider bg-zinc-900 text-white hover:bg-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-1 active:translate-y-0 group border-none">
            <Link href="/sign-in" className="flex items-center gap-3">
              Enter
              <IconArrowRight size={22} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </Button>

          <div className="flex items-center gap-6">
            <Link href="/sign-up" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all underline-offset-8 hover:underline italic">
              Register
            </Link>
            <div className="size-1 rounded-full bg-zinc-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 cursor-not-allowed italic">
              Docs
            </span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-12 flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-300">
        <div className="flex items-center gap-1.5 opacity-80">
          <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
          SYSTEM LIVE
        </div>
        <div className="size-1 rounded-full bg-zinc-100" />
        <div className="hover:text-primary transition-colors cursor-default">V2.4.0</div>
      </div>
    </div>
  );
}
