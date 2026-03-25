import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Wallet, ShoppingCart, PiggyBank, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TypeBadge } from "@/components/TypeBadge"
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/Skeletons"
import { useTransactions, useDebts, useIncome } from "@/hooks/useQueries"
import { formatBaht } from "@/lib/utils"

export default function OverviewPage() {
  const { data: transactions, isLoading: txLoading, error: txError, refetch: txRefetch } = useTransactions()
  const { data: debts, isLoading: debtsLoading } = useDebts()
  const { data: income, isLoading: incomeLoading } = useIncome()

  const netIncome = useMemo(() => {
    if (!income) return 0
    const row = income.find((r) => r.label === "Net Income")
    return row ? Number(row.value) : 52178.1
  }, [income])

  const totalDebtMonthly = useMemo(() => {
    if (!debts) return 0
    return debts.reduce((s, d) => s + Number(d.monthly_payment), 0)
  }, [debts])

  // Current month = last month in array that has data (derived from transactions in insertion order)
  const currentMonth = useMemo(() => {
    if (!transactions || transactions.length === 0) return ""
    // Preserve insertion order: first-seen order of months in the data
    const seen = new Set<string>()
    const months: string[] = []
    for (const t of transactions) {
      if (t.month && !seen.has(t.month)) { seen.add(t.month); months.push(t.month) }
    }
    return months[months.length - 1] ?? ""
  }, [transactions])

  const spentThisMonth = useMemo(() => {
    if (!transactions) return 0
    return transactions
      .filter((t) => t.month === currentMonth)
      .reduce((s, t) => s + Number(t.amount), 0)
  }, [transactions, currentMonth])

  const leftOver = netIncome - totalDebtMonthly - spentThisMonth

  // Bar chart data: total per month split by type (months in insertion order from data)
  const chartData = useMemo(() => {
    if (!transactions) return []
    const seen = new Set<string>()
    const months: string[] = []
    for (const t of transactions) {
      if (t.month && !seen.has(t.month)) { seen.add(t.month); months.push(t.month) }
    }
    return months.map((month) => {
      const rows = transactions.filter((t) => t.month === month)
      const ktc = rows.filter((t) => t.type === "KTC").reduce((s, t) => s + Number(t.amount), 0)
      const shopee = rows.filter((t) => t.type === "Shopee").reduce((s, t) => s + Number(t.amount), 0)
      return { month, KTC: ktc, Shopee: shopee }
    })
  }, [transactions])

  // Recent 10 transactions
  const recent = useMemo(() => {
    if (!transactions) return []
    return [...transactions]
      .filter((t) => t.date)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 10)
  }, [transactions])

  const isLoading = txLoading || debtsLoading || incomeLoading

  if (txError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p>Failed to load data. Please check your API URL and try again.</p>
        <Button variant="outline" onClick={() => txRefetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={<Wallet className="h-5 w-5 text-green-500" />}
              title="Net Income"
              value={formatBaht(netIncome)}
              description="Fixed monthly salary"
            />
            <StatCard
              icon={<CreditCard className="h-5 w-5 text-red-500" />}
              title="Total Debts / mo"
              value={formatBaht(totalDebtMonthly)}
              description="Sum of all monthly payments"
            />
            <StatCard
              icon={<ShoppingCart className="h-5 w-5 text-orange-500" />}
              title={`Spent (${currentMonth})`}
              value={formatBaht(spentThisMonth)}
              description="Current month transactions"
            />
            <StatCard
              icon={<PiggyBank className={`h-5 w-5 ${leftOver >= 0 ? "text-emerald-500" : "text-rose-500"}`} />}
              title="Left Over"
              value={formatBaht(leftOver)}
              description="Income − debts − spent"
              highlight={leftOver < 0}
            />
          </>
        )}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
          <CardDescription>KTC vs Shopee Pay per month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatBaht(Number(value)), ""]}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar dataKey="KTC" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Shopee" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest 10 transactions across all months</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">{tx.date ?? "—"}</TableCell>
                      <TableCell>{tx.month}</TableCell>
                      <TableCell className="font-medium">{tx.name}</TableCell>
                      <TableCell><TypeBadge type={tx.type} /></TableCell>
                      <TableCell className="text-right font-mono">{formatBaht(Number(tx.amount))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── CreditCard icon (reuse lucide) ──────────────────────────────────────────
function CreditCard({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

function StatCard({
  icon,
  title,
  value,
  description,
  highlight,
}: {
  icon: React.ReactNode
  title: string
  value: string
  description: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-rose-500/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold font-mono ${highlight ? "text-rose-500" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
