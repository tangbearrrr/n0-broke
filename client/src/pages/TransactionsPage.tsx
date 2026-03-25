import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { TableSkeleton } from "@/components/Skeletons"
import { TypeBadge } from "@/components/TypeBadge"
import {
  useTransactions, useAddTransaction, useUpdateTransaction, useDeleteTransaction,
} from "@/hooks/useQueries"
import { formatBaht, cn } from "@/lib/utils"
import { dateToCycleStart, cycleStartToSortable, cycleLabel, cycleKey, toDateOnly } from "@/lib/cycles"
import type { Transaction } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

type TxForm = {
  month: string
  date: string
  name: string
  amount: string
  type: "KTC" | "Shopee"
}

type SortKey = "date" | "name" | "amount" | "type"
type SortDir = "asc" | "desc"

const EMPTY_FORM: TxForm = { month: "", date: "", name: "", amount: "", type: "KTC" }

// ─── SortHead ─────────────────────────────────────────────────────────────────

function SortHead({ label, sortKey, current, dir, onSort, className }: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap group", className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc"
            ? <ArrowUp   className="h-3.5 w-3.5 text-primary" />
            : <ArrowDown className="h-3.5 w-3.5 text-primary" />
          : <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />}
      </span>
    </TableHead>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { data: transactions, isLoading, error, refetch } = useTransactions()
  const { mutateAsync: addTx,    isPending: adding   } = useAddTransaction()
  const { mutateAsync: updateTx, isPending: updating } = useUpdateTransaction()
  const { mutateAsync: deleteTx, isPending: deleting } = useDeleteTransaction()

  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editTx,       setEditTx]       = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [form,         setForm]         = useState<TxForm>(EMPTY_FORM)
  const [sortKey,      setSortKey]      = useState<SortKey>("date")
  const [sortDir,      setSortDir]      = useState<SortDir>("desc")
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 15

  // ── Group transactions by billing cycle (17th → 1st) ────────────────────

  const grouped = useMemo(() => {
    if (!transactions) return []

    // Map each transaction to its cycle key (using date; fall back to month field)
    const cycleMap = new Map<string, { cycle: { year: number; month: number }; rows: Transaction[] }>()

    transactions.forEach((t) => {
      const dateStr = toDateOnly(t.date)
      const cycle   = dateStr
        ? dateToCycleStart(dateStr)
        : { year: 2000, month: 1 } // no date → fallback bucket
      const key = cycleKey(cycle)
      if (!cycleMap.has(key)) cycleMap.set(key, { cycle, rows: [] })
      cycleMap.get(key)!.rows.push(t)
    })

    // Sort cycles newest first
    const entries = Array.from(cycleMap.values()).sort(
      (a, b) => cycleStartToSortable(b.cycle) - cycleStartToSortable(a.cycle)
    )

    return entries.map(({ cycle, rows }) => {
      const sorted = [...rows].sort((a, b) => {
        let av: string | number = a[sortKey] ?? ""
        let bv: string | number = b[sortKey] ?? ""
        if (sortKey === "amount") { av = Number(av); bv = Number(bv) }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
        if (av < bv) return sortDir === "asc" ? -1 : 1
        if (av > bv) return sortDir === "asc" ? 1 : -1
        return 0
      })

      const total       = rows.reduce((s, t) => s + Number(t.amount), 0)
      const ktcTotal    = rows.filter((t) => t.type === "KTC").reduce((s, t) => s + Number(t.amount), 0)
      const shopeeTotal = rows.filter((t) => t.type === "Shopee").reduce((s, t) => s + Number(t.amount), 0)

      return { key: cycleKey(cycle), label: cycleLabel(cycle), rows: sorted, total, ktcTotal, shopeeTotal }
    })
  }, [transactions, sortKey, sortDir])

  // Flatten for pagination
  const allRows = useMemo(() => grouped.flatMap((g) => g.rows), [grouped])
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE))
  const pageStart  = (page - 1) * PAGE_SIZE
  const pageEnd    = page * PAGE_SIZE

  // Which groups are (at least partially) visible on current page
  const visibleGroups = useMemo(() => {
    if (!grouped.length) return []
    let offset = 0
    return grouped
      .map((g) => {
        const start = offset
        const end   = offset + g.rows.length
        offset      = end
        // slice of this group that falls in the current page window
        const visStart = Math.max(start, pageStart)
        const visEnd   = Math.min(end, pageEnd)
        if (visStart >= visEnd) return null
        return {
          ...g,
          rows: g.rows.slice(visStart - start, visEnd - start),
          isFirstPage: visStart === start, // show group header
        }
      })
      .filter(Boolean) as Array<{
        key: string
        label: string
        rows: Transaction[]
        total: number
        ktcTotal: number
        shopeeTotal: number
        isFirstPage: boolean
      }>
  }, [grouped, pageStart, pageEnd])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir(key === "amount" ? "desc" : "asc") }
    setPage(1)
  }

  function openAdd() {
    setEditTx(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setForm({
      month:  tx.month,
      date:   toDateOnly(tx.date),
      name:   tx.name,
      amount: String(tx.amount),
      type:   tx.type,
    })
    setDialogOpen(true)
  }

  function monthFromDate(dateStr: string): string {
    const [year, month] = dateStr.split("-")
    const abbr = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase()
    return `${abbr} ${String(year).slice(-2)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const month = editTx
      ? form.month                          // keep original month when editing
      : monthFromDate(form.date)            // derive from date when adding
    const payload = {
      month,
      date:   form.date || null,
      name:   form.name,
      amount: parseFloat(form.amount),
      type:   form.type,
    }
    try {
      if (editTx) {
        await updateTx({ ...payload, id: editTx.id } as Transaction)
        toast.success("Transaction updated")
      } else {
        await addTx(payload)
        toast.success("Transaction added")
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(String(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteTx(deleteTarget.id)
      toast.success("Transaction deleted")
      setDeleteTarget(null)
    } catch (err) {
      toast.error(String(err))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Transactions</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {transactions?.length ?? 0} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            )}
            <Button size="sm" onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 md:px-6">
          {isLoading ? (
            <div className="px-4 md:px-0"><TableSkeleton rows={8} /></div>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">
              Failed to load transactions.
            </p>
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Date"   sortKey="date"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHead label="Name"   sortKey="name"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHead label="Type"   sortKey="type"   current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHead label="Amount" sortKey="amount" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          No transactions recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleGroups.map((group) => (
                        <>
                          {group.isFirstPage && (
                            <TableRow key={`header-${group.key}`} className="bg-muted/40 hover:bg-muted/40">
                              <TableCell colSpan={5} className="py-2 px-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="font-bold text-sm tracking-widest uppercase text-foreground">
                                    {group.label}
                                  </span>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />KTC {formatBaht(group.ktcTotal)}</span>
                                    <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Shopee {formatBaht(group.shopeeTotal)}</span>
                                    <span className="font-semibold text-foreground">Total {formatBaht(group.total)}</span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {group.rows.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-muted-foreground tabular-nums">{toDateOnly(tx.date) || "—"}</TableCell>
                              <TableCell className="font-medium">{tx.name}</TableCell>
                              <TableCell><TypeBadge type={tx.type} /></TableCell>
                              <TableCell className="text-right font-mono tabular-nums">{formatBaht(Number(tx.amount))}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 justify-end">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile card list ── */}
              <div className="md:hidden">
                {visibleGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">No transactions recorded</p>
                ) : (
                  visibleGroups.map((group) => (
                    <div key={group.key}>
                      {/* Group header */}
                      {group.isFirstPage && (
                        <div className="px-4 py-2 bg-muted/40 border-y">
                          <p className="font-bold text-xs tracking-widest uppercase">{group.label}</p>
                          <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />KTC {formatBaht(group.ktcTotal)}</span>
                            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-1" />Shopee {formatBaht(group.shopeeTotal)}</span>
                            <span className="font-semibold text-foreground">Total {formatBaht(group.total)}</span>
                          </div>
                        </div>
                      )}
                      {/* Transaction cards */}
                      {group.rows.map((tx) => (
                        <div key={tx.id} className="flex items-center px-4 py-3 border-b last:border-b-0 gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{tx.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <TypeBadge type={tx.type} />
                              <span className="text-xs text-muted-foreground tabular-nums">{toDateOnly(tx.date) || "—"}</span>
                            </div>
                          </div>
                          <p className="font-mono font-semibold text-sm tabular-nums shrink-0">{formatBaht(Number(tx.amount))}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 md:px-0 pt-4 border-t mt-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {pageStart + 1}–{Math.min(pageEnd, allRows.length)} of {allRows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTx ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-name">Name</Label>
              <Input
                id="tx-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Item name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">Amount (฿)</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as "KTC" | "Shopee" }))}
              >
                <SelectTrigger id="tx-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KTC">KTC</SelectItem>
                  <SelectItem value="Shopee">Shopee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={adding || updating}>
                {adding || updating ? "Saving…" : editTx ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{deleteTarget?.name}</strong>{" "}
              ({formatBaht(Number(deleteTarget?.amount ?? 0))}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
