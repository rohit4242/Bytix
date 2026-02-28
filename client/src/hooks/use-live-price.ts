"use client"

import { useEffect, useRef, useState } from "react"

export function useLivePrice(symbol?: string, initialPrice: number | string = 0) {
    const [price, setPrice] = useState<number>(Number(initialPrice))
    const [isLoading, setIsLoading] = useState(true)
    const prevRef = useRef<number>(Number(initialPrice))

    useEffect(() => {
        if (!symbol) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`)

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            const newPrice = Number(data.c)
            setPrice(newPrice)
            prevRef.current = newPrice
            setIsLoading(false)
        }

        ws.onerror = () => {
            setIsLoading(false)
        }

        return () => {
            ws.close()
        }
    }, [symbol])

    return { price, prevPrice: prevRef.current, isLoading }
}
