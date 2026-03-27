import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
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
import { TypeBadge } from "@/components/TypeBadge"
import { TableSkeleton } from "@/components/Skeletons"
import {
  useTransactionsByMonth, useAddTransaction, useUpdateTransaction,
  useDeleteTransaction, useDebts, useIncome, useNote, useSaveNote, useMonths,
} from "@/hooks/useQueries"
import { formatBaht } from "@/lib/utils"
import type { Transaction } from "@/lib/api"

type TxForm = {
  month: string
  date: string
  name: string
  amount: string
  type: "KTC" | "Shopee" | "Other"
}

const EMPTY_FORM = (month: string): TxForm => ({
  month,
  date: "",
  name: "",
  amount: "",
  type: "KTC",
})

export default function MonthlyPage() {
  const { data: apiMonths = [], isLoading: monthsLoading, isError: monthsError } = useMonths()

  const [extraMonths, setExtraMonths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("extraMonths") ?? "[]") } catch { return [] }
  })

  // Merge: API months first, extras appended (deduplicated)
  const allMonths: string[] = [
    ...apiMonths,
    ...extraMonths.filter((m) => !apiMonths.includes(m)),
  ]

  // Active month: empty while loading, auto-selects last month when list arrives
  const [activeMonth, setActiveMonth] = useState<string>("")

  useEffect(() => {
    if (allMonths.length > 0 && (!activeMonth || !allMonths.includes(activeMonth))) {
      setActiveMonth(allMonths[allMonths.length - 1])
    }
  }, [allMonths])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [form, setForm] = useState<TxForm>(EMPTY_FORM(activeMonth))

  const { data: transactions, isLoading: txLoading, error: txError, refetch } = useTransactionsByMonth(activeMonth)
  const { data: debts } = useDebts()
  const { data: income } = useIncome()
  const { data: noteData } = useNote(activeMonth)
  const { mutateAsync: saveNote } = useSaveNote()
  const { mutateAsync: addTx, isPending: adding } = useAddTransaction()
  const { mutateAsync: updateTx, isPending: updating } = useUpdateTransaction()
  const { mutateAsync: deleteTxMut, isPending: deleting } = useDeleteTransaction()

  const noteRef = useRef<HTMLTextAreaElement>(null)

  const netIncome = income?.find((r) => r.label === "Net Income")?.value ?? 52178.1
  const totalDebts = debts?.reduce((s, d) => s + Number(d.monthly_payment), 0) ?? 0
  const ktcTotal = transactions?.filter((t) => t.type === "KTC").reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const shopeeTotal = transactions?.filter((t) => t.type === "Shopee").reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const leftOver = Number(netIncome) - totalDebts - ktcTotal - shopeeTotal

  function openAdd() {
    setEditTx(null)
    setForm(EMPTY_FORM(activeMonth))
    setDialogOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx)
    setForm({ month: tx.month, date: tx.date ?? "", name: tx.name, amount: String(tx.amount), type: tx.type })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      month: form.month,
      date: form.date || null,
      name: form.name,
      amount: parseFloat(form.amount),
      type: form.type,
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
    if (!deleteTx) return
    try {
      await deleteTxMut(deleteTx.id)
      toast.success("Transaction deleted")
      setDeleteTx(null)
    } catch (err) {
      toast.error(String(err))
    }
  }

  async function handleNoteBlur() {
    const note = noteRef.current?.value ?? ""
    try {
      await saveNote({ month: activeMonth, note })
      toast.success("Note saved")
    } catch (err) {
      toast.error(String(err))
    }
  }

  function getCurrentMonthLabel(): string {
    const now = new Date()
    const abbr = now.toLocaleString("en-US", { month: "short" }).toUpperCase() // "MAR"
    const year = String(now.getFullYear()).slice(-2) // "26"
    return `${abbr} ${year}` // "MAR 26"
  }

  function handleAddMonth() {
    const m = getCurrentMonthLabel()
    if (allMonths.includes(m)) {
      toast.info(`${m} already exists`)
      return
    }
    setExtraMonths((prev) => {
      const updated = [...prev, m]
      localStorage.setItem("extraMonths", JSON.stringify(updated))
      return updated
    })
    setActiveMonth(m)
    toast.success(`${m} added`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Month Tabs */}
      <Tabs value={activeMonth} onValueChange={setActiveMonth}>
        <div className="flex items-center gap-2 flex-wrap">
          {monthsError ? (
            <p className="text-sm text-destructive">Failed to load months. Please refresh.</p>
          ) : monthsLoading && allMonths.length === 0 ? (
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 w-16 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <TabsList className="flex-wrap h-auto gap-1">
              {allMonths.map((m) => (
                <TabsTrigger key={m} value={m}>{m}</TabsTrigger>
              ))}
            </TabsList>
          )}
          <Button variant="outline" size="sm" onClick={handleAddMonth} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Month
          </Button>
        </div>

        {allMonths.map((m) => (
          <TabsContent key={m} value={m} className="space-y-6 mt-4">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <SummaryCard label="KTC FINAL" amount={ktcTotal} color="text-blue-600 dark:text-blue-400" />
              <SummaryCard label="Shopee FINAL" amount={shopeeTotal} color="text-orange-600 dark:text-orange-400" />
              <SummaryCard label="LEFT OVER" amount={leftOver} color={leftOver >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"} />
            </div>

            {/* Note */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Month Note</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  ref={noteRef}
                  defaultValue={noteData?.note ?? ""}
                  key={activeMonth + (noteData?.note ?? "")}
                  placeholder={`Notes for ${m}…`}
                  className="min-h-[80px] resize-none"
                  onBlur={handleNoteBlur}
                />
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transactions — {m}</CardTitle>
                <div className="flex items-center gap-2">
                  {txError && (
                    <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </Button>
                  )}
                  <Button size="sm" onClick={openAdd} className="gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <TableSkeleton />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!transactions || transactions.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No transactions for {m}
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground">{tx.date ?? "—"}</TableCell>
                            <TableCell className="font-medium">{tx.name}</TableCell>
                            <TableCell><TypeBadge type={tx.type} /></TableCell>
                            <TableCell className="text-right font-mono">{formatBaht(Number(tx.amount))}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTx(tx)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTx ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="tx-month">Month</Label>
              <Input
                id="tx-month"
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
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
              <Label htmlFor="tx-type">Payment Method</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "KTC" | "Shopee" | "Other" }))}>
                <SelectTrigger id="tx-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KTC">KTC (Credit Card)</SelectItem>
                  <SelectItem value="Shopee">Shopee Pay</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTx} onOpenChange={(o) => !o && setDeleteTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTx?.name}</strong> ({formatBaht(Number(deleteTx?.amount ?? 0))}).
              This action cannot be undone.
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

function SummaryCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold font-mono ${color}`}>{formatBaht(amount)}</p>
      </CardContent>
    </Card>
  )
}
