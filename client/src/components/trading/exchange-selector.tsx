"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Exchange {
    id: string
    label: string | null
    isActive: boolean
}

interface ExchangeSelectorProps {
    exchanges: Exchange[]
    value?: string
    onValueChange: (value: string) => void
    disabled?: boolean
}

export function ExchangeSelector({
    exchanges,
    value,
    onValueChange,
    disabled = false,
}: ExchangeSelectorProps) {
    const [open, setOpen] = React.useState(false)

    // Filter to only active (verified) exchanges
    const activeExchanges = exchanges.filter(e => e.isActive)
    const selectedExchange = activeExchanges.find((e) => e.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-bold text-xs uppercase tracking-tight h-10 border-border/50"
                    disabled={disabled || activeExchanges.length === 0}
                >
                    {selectedExchange
                        ? selectedExchange.label || "Unnamed Exchange"
                        : activeExchanges.length === 0
                            ? "No Verified Exchanges"
                            : "Select Exchange..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command className="border-none">
                    <CommandInput placeholder="Search exchange..." className="h-9 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-2 text-xs text-center text-muted-foreground uppercase font-bold">
                            No exchange found.
                        </CommandEmpty>
                        <CommandGroup>
                            {activeExchanges.map((exchange) => (
                                <CommandItem
                                    key={exchange.id}
                                    value={exchange.id}
                                    onSelect={(currentValue) => {
                                        onValueChange(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                    className="text-xs font-bold uppercase py-2 cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === exchange.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {exchange.label || "Unnamed Exchange"}
                                    <span className="ml-auto text-[9px] text-muted-foreground opacity-50">
                                        ID: {exchange.id.slice(-6)}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
