import * as React from "react"
import { useState, useMemo, useCallback } from "react"
import {
    ChevronDown,
    RefreshCw,
    Search,
    Filter,
    Inbox,
    ArrowRight,
    LogIn,
    LogOut,
    Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SignalBadge } from "@/components/trading/signal-badge"
import { SignalDetail } from "./signal-detail"
import { cn, formatDateTime } from "@/lib/utils"

const ROWS_PER_PAGE = 15

interface SignalsTableProps {
    data: any[]
    onDelete?: (id: string) => Promise<void>
    onDeleteAll?: () => Promise<void>
}

export function SignalsTable({ data, onDelete, onDeleteAll }: SignalsTableProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isDeletingAll, setIsDeletingAll] = useState(false)
    const [confirmAction, setConfirmAction] = useState<null | { type: "SINGLE" | "ALL"; id?: string }>(null)

    // Filter logic
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchesSearch =
                !searchQuery ||
                item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.bot?.name.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === "ALL" || item.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [data, searchQuery, statusFilter])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE))
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE
        return filteredData.slice(start, start + ROWS_PER_PAGE)
    }, [filteredData, currentPage])

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleConfirmDelete = async () => {
        if (!confirmAction) return

        if (confirmAction.type === "SINGLE" && confirmAction.id && onDelete) {
            setDeletingId(confirmAction.id)
            try {
                await onDelete(confirmAction.id)
            } finally {
                setDeletingId(null)
            }
        } else if (confirmAction.type === "ALL" && onDeleteAll) {
            setIsDeletingAll(true)
            try {
                await onDeleteAll()
            } finally {
                setIsDeletingAll(false)
            }
        }
        setConfirmAction(null)
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Inbox className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">No signals found</h3>
                <p className="mt-1 text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Waiting for incoming webhook alerts.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filters Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Showing {filteredData.length} signals
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Search bot or symbol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-48 pl-8 text-xs bg-card"
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                    >
                        <SelectTrigger size="sm" className="w-32 h-8 text-xs bg-card">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="PROCESSED">Processed</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                            <SelectItem value="SKIPPED">Skipped</SelectItem>
                        </SelectContent>
                    </Select>
                    {onDeleteAll && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmAction({ type: "ALL" })}
                            disabled={isDeletingAll || filteredData.length === 0}
                            className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive whitespace-nowrap"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Purge History
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-8" />
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bot</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symbol</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                            <TableHead className="w-[50px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map((signal) => {
                            const isExpanded = expandedIds.has(signal.id)
                            const action = signal.action.toUpperCase()
                            const isEntry = action.includes("BUY") || action.includes("LONG") || action.includes("ENTRY")
                            const isDeleting = deletingId === signal.id

                            return (
                                <React.Fragment key={signal.id}>
                                    <TableRow
                                        className={cn(
                                            "cursor-pointer transition-colors hover:bg-muted/50",
                                            isExpanded && "bg-muted/30"
                                        )}
                                        onClick={() => toggleExpand(signal.id)}
                                    >
                                        <TableCell className="pr-0">
                                            <ChevronDown
                                                className={cn(
                                                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                    isExpanded && "rotate-180"
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-semibold text-foreground tracking-tight">
                                                {signal.bot?.name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-semibold uppercase tracking-wider gap-1.5 px-2 py-0.5",
                                                    isEntry
                                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                                                        : "border-red-500/30 bg-red-500/10 text-red-600"
                                                )}
                                            >
                                                {isEntry ? (
                                                    <LogIn className="h-3 w-3" />
                                                ) : (
                                                    <LogOut className="h-3 w-3" />
                                                )}
                                                {action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-mono font-bold tracking-tighter">
                                                {signal.symbol}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <SignalBadge status={signal.status} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {formatDateTime(signal.createdAt)}
                                                </span>
                                                {signal.errorMessage && (
                                                    <span className="text-[9px] text-red-500 font-bold truncate max-w-[150px] uppercase tracking-tighter">
                                                        Error Logged
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                disabled={isDeleting}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setConfirmAction({ type: "SINGLE", id: signal.id })
                                                }}
                                            >
                                                {isDeleting ? (
                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={7} className="p-0">
                                                <div className="border-t border-border bg-muted/5 px-6 py-4 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                                    <SignalDetail signal={signal} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                                className="h-7 w-7 p-0"
                            >
                                {"<"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => p + 1)}
                                className="h-7 w-7 p-0"
                            >
                                {">"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.type === "SINGLE" ? "Delete Signal" : "Purge All Signals"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.type === "SINGLE"
                                ? "This will permanently remove this signal from the database history."
                                : "This will permanently delete ALL signals for this user. This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
