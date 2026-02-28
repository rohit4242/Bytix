"use client"

import { useState, useEffect } from "react"

/**
 * Hook to check the backend server status by polling the health endpoint.
 * Returns 'online', 'offline', or 'checking'.
 */
export function useServerStatus() {
    const [status, setStatus] = useState<"online" | "offline" | "checking">("checking")

    // Use the backend URL from environment or default to port 4000
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

    useEffect(() => {
        let isMounted = true
        let intervalId: NodeJS.Timeout

        const checkStatus = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/v1/health`, {
                    method: 'GET',
                    // Use no-cache to ensure we get fresh status
                    cache: 'no-store'
                })

                if (response.ok && isMounted) {
                    setStatus("online")
                } else if (isMounted) {
                    setStatus("offline")
                }
            } catch (error) {
                if (isMounted) {
                    setStatus("offline")
                }
            }
        }

        // Initial check
        checkStatus()

        // Poll every 30 seconds
        intervalId = setInterval(checkStatus, 30000)

        return () => {
            isMounted = false
            clearInterval(intervalId)
        }
    }, [BACKEND_URL])

    return status
}
