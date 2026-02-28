import axios from "axios"
import { getUserSession } from "./auth-server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"

/**
 * Server-side API client for backend communication.
 * Automatically injects authentication headers from the current session if available.
 */
export const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
    },
})

// Add request interceptor to inject Bearer token
api.interceptors.request.use(async (config) => {
    try {
        const session = await getUserSession()
        if (session?.session?.token) {
            config.headers.Authorization = `Bearer ${session.session.token}`
        }
    } catch (error) {
        // Silently fail if session can't be retrieved (e.g. public routes)
        console.warn("[API Client] Could not inject auth token:", error)
    }
    return config
})

// Add response interceptor for logging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("[Backend API Error]:", error.response?.data || error.message)
        return Promise.reject(error)
    }
)
