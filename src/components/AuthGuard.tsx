import { useAuth } from "@/hooks/useAuth"
import LoginPage from "@/pages/LoginPage"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage error={error} />

  return <>{children}</>
}
