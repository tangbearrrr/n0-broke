import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { TableSkeleton } from "@/components/Skeletons"
import { TypeCombobox } from "@/components/TypeCombobox"
import { useDebts, useAddDebt, useUpdateDebt, useDeleteDebt } from "@/hooks/useQueries"
import { formatBaht, cn } from "@/lib/utils"
import type { Debt } from "@/lib/api"

type DebtForm = Omit<Debt, "id">
type SortKey  = "debt_name" | "type" | "monthly_payment" | "remaining"
type SortDir  = "asc" | "desc"

const EMPTY_FORM: DebtForm = { debt_name: "", monthly_payment: 0, remaining: "-", type: "" }

// ─── colour map ───────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, {
  strip:   string   // top accent bar colour
  tint:    string   // card bg when active
  text:    string   // amount / label text when active
  badge:   string   // table row pill
  bar:     string   // progress bar fill
}> = {
  // LINE BK — bank transfer, trustworthy green
  "LINE BK": {
    strip: "bg-emerald-500",
    tint:  "bg-emerald-50 dark:bg-emerald-950/50",
    text:  "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    bar:   "bg-emerald-500",
  },
  // Shopee — brand orange
  SHOPEE: {
    strip: "bg-orange-400",
    tint:  "bg-orange-50 dark:bg-orange-950/50",
    text:  "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    bar:   "bg-orange-400",
  },
  // KTC — credit card, deep red (danger/liability)
  KTC: {
    strip: "bg-rose-700",
    tint:  "bg-rose-50 dark:bg-rose-950/50",
    text:  "text-rose-700 dark:text-rose-300",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    bar:   "bg-rose-700",
  },
  // Need — essentials/necessities, amber warmth
  NEED: {
    strip: "bg-amber-500",
    tint:  "bg-amber-50 dark:bg-amber-950/50",
    text:  "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    bar:   "bg-amber-500",
  },
  // Czech — named after gf, pink 🌸
  CZECH: {
    strip: "bg-pink-400",
    tint:  "bg-pink-50 dark:bg-pink-950/50",
    text:  "text-pink-600 dark:text-pink-300",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    bar:   "bg-pink-400",
  },
  DEFAULT: {
    strip: "bg-sky-400",
    tint:  "bg-sky-50 dark:bg-sky-950/50",
    text:  "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    bar:   "bg-sky-400",
  },
}

function getColor(type: string) {
  return TYPE_COLOR[type?.toUpperCase()] ?? TYPE_COLOR.DEFAULT
}

// ─── RemainingCell ────────────────────────────────────────────────────────────
function RemainingCell({ value }: { value: string }) {
  if (!value || value === "-") return <span className="text-muted-foreground italic">Ongoing</span>
  const m = value.match(/^(\d+)\/(\d+)$/)
  if (m) {
    const paid = parseInt(m[1]), total = parseInt(m[2])
    const pct = Math.round((paid / total) * 100)
    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{paid} of {total} paid</span>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }
  const d = new Date(value)
  if (!isNaN(d.getTime())) return <span>{d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
  return <span>{value}</span>
}

// ─── SortHead ─────────────────────────────────────────────────────────────────
function SortHead({ label, sortKey, current, dir, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir
  onSort: (k: SortKey) => void; className?: string
}) {
  const active = current === sortKey
  return (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap group", className)} onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? dir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
          : <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />}
      </span>
    </TableHead>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DebtsPage() {
  const { data: debts, isLoading, error, refetch } = useDebts()
  const { mutateAsync: addDebt,    isPending: adding   } = useAddDebt()
  const { mutateAsync: updateDebt, isPending: updating } = useUpdateDebt()
  const { mutateAsync: deleteDebt, isPending: deleting } = useDeleteDebt()

  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editDebt,     setEditDebt]     = useState<Debt | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null)
  const [form,         setForm]         = useState<DebtForm>(EMPTY_FORM)
  const [activeType,   setActiveType]   = useState<string | null>(null)
  const [sortKey,      setSortKey]      = useState<SortKey>("monthly_payment")
  const [sortDir,      setSortDir]      = useState<SortDir>("desc")
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 10

  // ── derived ──────────────────────────────────────────────────────────────
  const totalMonthly = debts?.reduce((s, d) => s + Number(d.monthly_payment), 0) ?? 0

  const byType = useMemo(() => {
    if (!debts) return []
    const map: Record<string, { total: number; count: number }> = {}
    debts.forEach((d) => {
      const t = d.type || "—"
      if (!map[t]) map[t] = { total: 0, count: 0 }
      map[t].total += Number(d.monthly_payment)
      map[t].count += 1
    })
    return Object.entries(map)
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [debts])

  const displayedDebts = useMemo(() => {
    if (!debts) return []
    let rows = activeType ? debts.filter((d) => (d.type || "—") === activeType) : [...debts]
    rows.sort((a, b) => {
      let av: string | number = a[sortKey] ?? ""
      let bv: string | number = b[sortKey] ?? ""
      if (sortKey === "monthly_payment") { av = Number(av); bv = Number(bv) }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return rows
  }, [debts, activeType, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(displayedDebts.length / PAGE_SIZE))
  const pagedDebts = displayedDebts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── handlers ─────────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir(key === "monthly_payment" ? "desc" : "asc") }
    setPage(1)
  }

  function openAdd()    { setEditDebt(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  function openEdit(d: Debt) {
    setEditDebt(d)
    setForm({ debt_name: d.debt_name, monthly_payment: Number(d.monthly_payment), remaining: d.remaining, type: d.type })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editDebt) { await updateDebt({ ...form, id: editDebt.id }); toast.success("Debt updated") }
      else          { await addDebt(form);                             toast.success("Debt added")   }
      setDialogOpen(false)
    } catch (err) { toast.error(String(err)) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await deleteDebt(deleteTarget.id); toast.success("Debt deleted"); setDeleteTarget(null) }
    catch (err) { toast.error(String(err)) }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* ── Summary tiles ─────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">

        {/* All */}
        <button
          type="button"
          onClick={() => { setActiveType(null); setPage(1) }}
          className={cn(
            "text-left rounded-2xl overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeType === null ? "bg-indigo-50 dark:bg-indigo-950/50 shadow-sm" : "bg-card hover:bg-muted/40"
          )}
        >
          <div className={cn("h-1 w-full transition-all duration-200", activeType === null ? "bg-indigo-500" : "bg-border")} />
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-semibold uppercase tracking-widest transition-colors", activeType === null ? "text-indigo-700 dark:text-indigo-300" : "text-muted-foreground")}>All</span>
              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums transition-colors", activeType === null ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-muted text-muted-foreground")}>
                {debts?.length ?? 0}
              </span>
            </div>
            <p className={cn("text-lg font-bold font-mono tabular-nums transition-colors", activeType === null ? "text-indigo-700 dark:text-indigo-300" : "text-foreground")}>
              {formatBaht(totalMonthly)}
            </p>
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div className={cn("h-full w-full rounded-full transition-colors", activeType === null ? "bg-indigo-500" : "bg-muted-foreground/30")} />
            </div>
            <p className="text-[10px] text-muted-foreground">100% of total</p>
          </div>
        </button>

        {/* Per-type */}
        {isLoading ? null : byType.map(({ type, total, count }) => {
          const pct    = totalMonthly > 0 ? (total / totalMonthly) * 100 : 0
          const color  = getColor(type)
          const active = activeType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setActiveType(active ? null : type); setPage(1) }}
              className={cn(
                "text-left rounded-2xl overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? cn(color.tint, "shadow-sm") : "bg-card hover:bg-muted/40"
              )}
            >
              <div className={cn("h-1 w-full transition-all duration-200", active ? color.strip : "bg-border")} />
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[11px] font-semibold uppercase tracking-widest transition-colors", active ? color.text : "text-muted-foreground")}>
                    {type}
                  </span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums transition-colors", active ? color.badge : "bg-muted text-muted-foreground")}>
                    {count}
                  </span>
                </div>
                <p className={cn("text-lg font-bold font-mono tabular-nums transition-colors", active ? color.text : "text-foreground")}>
                  {formatBaht(total)}
                </p>
                <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", color.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(1)}% of total</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Debts Table ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Debts</CardTitle>
            <CardDescription>Track your loans and recurring obligations</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* active filter chip */}
            {activeType && (
              <button
                onClick={() => { setActiveType(null); setPage(1) }}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                  getColor(activeType).badge
                )}
              >
                {activeType} <X className="h-3 w-3" />
              </button>
            )}
            {error && (
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            )}
            <Button size="sm" onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" /> Add Debt
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 md:px-6">
          {isLoading ? <div className="px-4 md:px-0"><TableSkeleton rows={4} /></div> : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Debt Name"       sortKey="debt_name"       current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHead label="Type"            sortKey="type"            current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHead label="Monthly Payment" sortKey="monthly_payment" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHead label="Remaining"       sortKey="remaining"       current={sortKey} dir={sortDir} onSort={handleSort} />
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedDebts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {activeType ? `No debts for "${activeType}"` : "No debts recorded"}
                        </TableCell>
                      </TableRow>
                    ) : pagedDebts.map((d) => {
                      const c = getColor(d.type)
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.debt_name}</TableCell>
                          <TableCell>
                            <button onClick={() => { setActiveType(activeType === d.type ? null : d.type); setPage(1) }} className={cn("text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-75", c.badge)}>{d.type}</button>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatBaht(Number(d.monthly_payment))}</TableCell>
                          <TableCell className="min-w-[140px]"><RemainingCell value={d.remaining} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile card list ── */}
              <div className="md:hidden">
                {displayedDebts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm px-4">
                    {activeType ? `No debts for "${activeType}"` : "No debts recorded"}
                  </p>
                ) : pagedDebts.map((d) => {
                  const c = getColor(d.type)
                  return (
                    <div key={d.id} className="flex items-center px-4 py-3 border-b last:border-b-0 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{d.debt_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => { setActiveType(activeType === d.type ? null : d.type); setPage(1) }} className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", c.badge)}>{d.type}</button>
                          <span className="text-xs text-muted-foreground"><RemainingCell value={d.remaining} /></span>
                        </div>
                      </div>
                      <p className="font-mono font-semibold text-sm tabular-nums shrink-0">{formatBaht(Number(d.monthly_payment))}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 md:px-0 pt-4 border-t mt-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayedDebts.length)} of {displayedDebts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDebt ? "Edit Debt" : "Add Debt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="d-name">Debt Name</Label>
              <Input id="d-name" value={form.debt_name} onChange={(e) => setForm(f => ({ ...f, debt_name: e.target.value }))} placeholder="e.g. Car Loan" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-payment">Monthly Payment (฿)</Label>
              <Input id="d-payment" type="number" step="0.01" min="0" value={form.monthly_payment} onChange={(e) => setForm(f => ({ ...f, monthly_payment: parseFloat(e.target.value) }))} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-remaining">Remaining <span className="text-muted-foreground text-xs">(date, "6/60", or "-")</span></Label>
              <Input id="d-remaining" value={form.remaining} onChange={(e) => setForm(f => ({ ...f, remaining: e.target.value }))} placeholder='e.g. 2026-12-01 or 6/60 or "-"' />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <TypeCombobox value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v }))} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={adding || updating}>{adding || updating ? "Saving…" : editDebt ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.debt_name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
