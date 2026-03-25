import { Link, useLocation } from "react-router-dom"
import { CreditCard, TrendingDown, ReceiptText, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/summary",      label: "Summary",      icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ReceiptText     },
  { to: "/debts",        label: "Debts",        icon: CreditCard      },
]

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-card h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 shrink-0 border-b">
          <TrendingDown className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">N0broke</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 text-xs text-muted-foreground">
          Personal Expense Tracker
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
