import { Moon, Sun, TrendingDown, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"
import { useAuth } from "@/hooks/useAuth"
import { useLocation } from "react-router-dom"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PAGE_TITLES: Record<string, string> = {
  "/summary":      "Summary",
  "/transactions": "Transactions",
  "/debts":        "Debts",
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const { user, logOut } = useAuth()
  const title = PAGE_TITLES[pathname] ?? "N0broke"

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10 flex items-center px-4 gap-3">
      {/* Brand — mobile only */}
      <div className="flex items-center gap-2 md:hidden">
        <TrendingDown className="h-5 w-5 text-primary" />
        <span className="font-bold text-base tracking-tight">N0broke</span>
      </div>

      {/* Page title — desktop only */}
      <h1 className="hidden md:block font-semibold text-lg flex-1">{title}</h1>

      <div className="flex-1 md:hidden" />

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* User avatar + sign out */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden ring-2 ring-border focus-visible:outline-none focus-visible:ring-primary">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName ?? "User"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="bg-primary text-primary-foreground text-xs font-bold h-full w-full flex items-center justify-center">
                  {user.displayName?.[0]?.toUpperCase() ?? "U"}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b mb-1">
              <p className="text-xs font-medium truncate">{user.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
