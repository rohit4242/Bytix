"use client"

import * as React from "react"
import {
    IconShield,
    IconPlus,
    IconTrash,
    IconInfoCircle,
    IconLoader2,
    IconRefresh
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { ConfirmationDialog } from "@/components/confirmation-dialog"

interface WhitelistedIP {
    id: string
    ip: string
    label: string
    addedAt: string
}

export default function IPWhitelistPage() {
    const [ips, setIps] = React.useState<WhitelistedIP[]>([
        { id: "1", ip: "192.168.1.1", label: "Office Main", addedAt: "2024-02-24" },
        { id: "2", ip: "10.0.0.1", label: "Dev Server", addedAt: "2024-02-23" },
    ])
    const [newIp, setNewIp] = React.useState("")
    const [newLabel, setNewLabel] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)
    const [detecting, setDetecting] = React.useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)

    const handleAddIP = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newIp) return

        setIsAdding(true)
        // Simulate API call
        setTimeout(() => {
            const newItem: WhitelistedIP = {
                id: Math.random().toString(36).substr(2, 9),
                ip: newIp,
                label: newLabel || "Unnamed",
                addedAt: new Date().toISOString().split('T')[0]
            }
            setIps([newItem, ...ips])
            setNewIp("")
            setNewLabel("")
            setIsAdding(false)
            toast.success("IP added to whitelist")
        }, 800)
    }

    const confirmDelete = (id: string) => {
        setDeletingId(id)
        setIsDeleteModalOpen(true)
    }

    const handleRemoveIP = () => {
        if (!deletingId) return
        setIps(ips.filter(ip => ip.id !== deletingId))
        setIsDeleteModalOpen(false)
        setDeletingId(null)
        toast.success("IP removed from whitelist")
    }

    const detectCurrentIP = () => {
        setDetecting(true)
        // Simulate detection
        setTimeout(() => {
            setNewIp("203.0.113.42") // Mock detected IP
            setDetecting(false)
            toast.info("Your current IP has been detected")
        }, 1200)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-0.5 mt-6">
                <h1 className="text-2xl font-bold tracking-tight">IP Whitelisting</h1>
                <p className="text-muted-foreground">
                    Restrain Admin access to specific IP addresses for enhanced security.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Form Section */}
                <div className="md:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Add New IP</CardTitle>
                            <CardDescription>
                                Add a static IP address to the authorized list.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddIP} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground">IP Address</label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. 192.168.1.1"
                                            value={newIp}
                                            onChange={(e) => setNewIp(e.target.value)}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={detectCurrentIP}
                                            disabled={detecting}
                                            title="Detect My IP"
                                        >
                                            {detecting ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground">Label (Optional)</label>
                                    <Input
                                        placeholder="e.g. Home Office"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full" disabled={isAdding || !newIp}>
                                    {isAdding ? <IconLoader2 className="mr-2 size-4 animate-spin" /> : <IconPlus className="mr-2 size-4" />}
                                    Add to Whitelist
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="bg-muted/30 p-4 rounded-b-lg border-t">
                            <div className="flex gap-3 text-[12px] text-muted-foreground leading-relaxed">
                                <IconInfoCircle className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                <p>
                                    Only users on these IP addresses will be able to access the Admin dashboard.
                                </p>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                {/* Table Section */}
                <div className="md:col-span-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-medium">Authorized IPs</CardTitle>
                                    <CardDescription>All IP addresses currently allowed for Admin access.</CardDescription>
                                </div>
                                <Badge variant="secondary" className="text-xs font-medium">
                                    {ips.length} Total
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-semibold px-4 py-3">IP Address</TableHead>
                                            <TableHead className="font-semibold px-4 py-3">Label</TableHead>
                                            <TableHead className="font-semibold px-4 py-3">Added Date</TableHead>
                                            <TableHead className="text-right px-4 py-3">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ips.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    No whitelisted IP addresses found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ips.map((ip) => (
                                                <TableRow key={ip.id}>
                                                    <TableCell className="font-mono text-xs px-4 py-3">{ip.ip}</TableCell>
                                                    <TableCell className="text-sm px-4 py-3">{ip.label}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground px-4 py-3">{ip.addedAt}</TableCell>
                                                    <TableCell className="text-right px-4 py-3">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                            onClick={() => confirmDelete(ip.id)}
                                                        >
                                                            <IconTrash className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmationDialog
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                title="Remove IP?"
                description="This IP address will no longer be authorized to access the Admin dashboard."
                onConfirm={handleRemoveIP}
                confirmText="Remove"
            />
        </div>
    )
}
