import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.listTransactions(),
  })
}

export function useTransactionsByMonth(month: string) {
  return useQuery({
    queryKey: ["transactions", month],
    queryFn: () => api.listByMonth(month),
    enabled: !!month,
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.addTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

// ─── Debts ───────────────────────────────────────────────────────────────────

export function useDebts() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: () => api.listDebts(),
  })
}

export function useAddDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.addDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["debts"] }),
  })
}

// ─── Income ──────────────────────────────────────────────────────────────────

export function useIncome() {
  return useQuery({
    queryKey: ["income"],
    queryFn: () => api.getIncome(),
    staleTime: Infinity, // income is fixed
  })
}

// ─── Months ──────────────────────────────────────────────────────────────────

export function useMonths() {
  return useQuery({
    queryKey: ["months"],
    queryFn: () => api.listMonths(),
    staleTime: 5 * 60 * 1000,
    placeholderData: [] as string[],
  })
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export function useNote(month: string) {
  return useQuery({
    queryKey: ["note", month],
    queryFn: () => api.getNote(month),
    enabled: !!month,
  })
}

export function useSaveNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ month, note }: { month: string; note: string }) =>
      api.saveNote(month, note),
    onSuccess: (_data, { month }) => {
      qc.invalidateQueries({ queryKey: ["note", month] })
    },
  })
}
