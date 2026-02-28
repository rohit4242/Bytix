"use client"

import * as React from "react"
import { IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { PositionMode } from "@/generated/prisma"

interface ExchangeModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: any) => Promise<void>
    isLoading: boolean
    initialData?: {
        id?: string
        label: string
        apiKey: string
        apiSecret: string
        positionMode: PositionMode
    }
    verificationStatus?: "idle" | "verifying" | "success" | "error"
    verificationError?: string | null
}

export function ExchangeModal({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
    initialData,
    verificationStatus = "idle",
    verificationError
}: ExchangeModalProps) {
    const [formData, setFormData] = React.useState({
        label: "",
        apiKey: "",
        apiSecret: "",
        positionMode: "ONE_WAY" as PositionMode
    })

    React.useEffect(() => {
        if (open) {
            setFormData({
                label: initialData?.label || "",
                apiKey: initialData?.apiKey || "",
                apiSecret: initialData?.apiSecret || "",
                positionMode: initialData?.positionMode || "ONE_WAY"
            })
        }
    }, [open, initialData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? "Edit Connection" : "Add Connection"}</DialogTitle>
                    <DialogDescription>
                        Configure Binance API credentials securely.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="label">Label</Label>
                        <Input
                            id="label"
                            placeholder="Main Account"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                            id="apiKey"
                            placeholder="Key"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            required={!initialData?.id}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <Input
                            id="apiSecret"
                            type="password"
                            placeholder="Secret"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                            required={!initialData?.id}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mode">Position Mode</Label>
                        <Select
                            value={formData.positionMode}
                            onValueChange={(v: PositionMode) => setFormData({ ...formData, positionMode: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ONE_WAY">One-Way</SelectItem>
                                <SelectItem value="HEDGE">Hedge Mode</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {verificationStatus === "verifying" && (
                        <div className="flex items-center gap-2 text-xs text-blue-500 font-medium bg-blue-50/50 p-2 rounded-md border border-blue-100/50">
                            <IconLoader2 className="h-3 w-3 animate-spin" />
                            Verifying with Binance API...
                        </div>
                    )}

                    {verificationStatus === "success" && (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50/50 p-2 rounded-md border border-green-100/50">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                            Verification successful. Account verified!
                        </div>
                    )}

                    {verificationStatus === "error" && verificationError && (
                        <div className="flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/5 p-2 rounded-md border border-destructive/10">
                            <span>Verification failed: {verificationError}</span>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" className="w-full" disabled={isLoading || verificationStatus === "verifying"}>
                            {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData?.id ? "Save Changes" : "Connect"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
