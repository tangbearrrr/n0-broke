import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTransactions, useDebts, useIncome } from "@/hooks/useQueries"
import { formatBaht, cn } from "@/lib/utils"
import { dateToCycleStart, cycleStartToSortable, cycleLabel, cyclePayMonth, cycleKey, toDateOnly } from "@/lib/cycles"

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: "red" | "green" }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={cn(
          "text-base md:text-2xl font-bold font-mono tabular-nums",
          highlight === "red"   && "text-rose-600 dark:text-rose-400",
          highlight === "green" && "text-emerald-600 dark:text-emerald-400",
          !highlight            && "text-foreground",
        )}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5 hidden md:block">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { data: transactions, isLoading: txLoading } = useTransactions()
  const { data: debts,        isLoading: debtsLoading } = useDebts()
  const { data: income,       isLoading: incomeLoading } = useIncome()

  const isLoading = txLoading || debtsLoading || incomeLoading

  // ── Fixed values ───────────────────────────────────────────────────────────
  const netIncome    = income?.find((r) => r.label === "Net Income")?.value ?? 0
  const totalDebts   = debts?.reduce((s, d) => s + Number(d.monthly_payment), 0) ?? 0
  const afterDebts   = netIncome - totalDebts

  // ── Build per-cycle summaries ──────────────────────────────────────────────
  const cycles = useMemo(() => {
    if (!transactions) return []

    const cycleMap = new Map<string, {
      cycle: { year: number; month: number }
      ktc: number
      shopee: number
    }>()

    transactions.forEach((t) => {
      const dateStr = toDateOnly(t.date)
      const cycle   = dateStr ? dateToCycleStart(dateStr) : { year: 2000, month: 1 }
      const key     = cycleKey(cycle)
      if (!cycleMap.has(key)) cycleMap.set(key, { cycle, ktc: 0, shopee: 0 })
      const entry = cycleMap.get(key)!
      if (t.type === "KTC")    entry.ktc    += Number(t.amount)
      if (t.type === "Shopee") entry.shopee += Number(t.amount)
    })

    return Array.from(cycleMap.values())
      .sort((a, b) => cycleStartToSortable(b.cycle) - cycleStartToSortable(a.cycle))
      .map(({ cycle, ktc, shopee }) => {
        const total    = ktc + shopee
        const leftOver = afterDebts - total
        return { key: cycleKey(cycle), label: cycleLabel(cycle), payMonth: cyclePayMonth(cycle), ktc, shopee, total, leftOver }
      })
  }, [transactions, afterDebts])

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-2 grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-1 pt-4 px-4"><div className="h-3 w-12 rounded bg-muted animate-pulse" /></CardHeader>
              <CardContent className="px-4 pb-4"><div className="h-6 w-20 rounded bg-muted animate-pulse" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* ── Fixed overview ─────────────────────────────────────────────── */}
      <div className="grid gap-2 grid-cols-3">
        <StatCard
          label="Income"
          value={formatBaht(netIncome)}
          sub="Monthly salary"
        />
        <StatCard
          label="Debts"
          value={formatBaht(totalDebts)}
          sub={`${debts?.length ?? 0} obligations`}
          highlight="red"
        />
        <StatCard
          label="Left"
          value={formatBaht(afterDebts)}
          sub="Income − debts"
          highlight={afterDebts >= 0 ? "green" : "red"}
        />
      </div>

      {/* ── Per-cycle breakdown ────────────────────────────────────────── */}
      <div className="space-y-3">
        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No transactions recorded yet.
          </p>
        ) : (
          cycles.map((c) => (
            <Card key={c.key} className="overflow-hidden">
              {/* colour accent bar */}
              <div className={cn(
                "h-1 w-full",
                c.leftOver >= 0 ? "bg-emerald-500" : "bg-rose-500"
              )} />
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Cycle label + pay month */}
                  <div>
                    <p className="font-bold text-base">{c.payMonth}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>

                  {/* Breakdown grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-1 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">KTC</p>
                      <p className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {formatBaht(c.ktc)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Shopee</p>
                      <p className="font-mono tabular-nums text-orange-600 dark:text-orange-400">
                        {formatBaht(c.shopee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Spent</p>
                      <p className="font-mono tabular-nums font-semibold">
                        {formatBaht(c.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Left Over</p>
                      <p className={cn(
                        "font-mono tabular-nums font-bold text-base",
                        c.leftOver >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}>
                        {formatBaht(c.leftOver)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar: spent vs after-debts budget */}
                {afterDebts > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Spent</span>
                      <span>{Math.min(Math.round((c.total / afterDebts) * 100), 100)}% of budget</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          c.leftOver >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        )}
                        style={{ width: `${Math.min((c.total / afterDebts) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
