import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { AuthGuard } from "@/components/AuthGuard"
import DebtsPage from "@/pages/DebtsPage"
import TransactionsPage from "@/pages/TransactionsPage"
import SummaryPage from "@/pages/SummaryPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGuard>
          <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-auto pb-16 md:pb-0">
                <Routes>
                  <Route path="/" element={<Navigate to="/summary" replace />} />
                  <Route path="/summary" element={<SummaryPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/debts" element={<DebtsPage />} />
                  <Route path="*" element={<Navigate to="/summary" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </AuthGuard>
        <Toaster position="bottom-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
