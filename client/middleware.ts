import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const PUBLIC_PATHS = [
    "/sign-in",
    "/sign-up",
    "/api/auth",
    "/unauthorized",
]

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Allow all public paths and static assets
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next()
    }

    // Check for a Better Auth session cookie
    const sessionCookie = getSessionCookie(req)
    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/sign-in", req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        // Run on all paths except Next.js internals and static files
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}
