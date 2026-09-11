import { supabase } from "@/lib/supabase"

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  month: string
  date: string | null
  name: string
  amount: number
  type: "KTC" | "Shopee" | "Other"
}

export interface IncomeRow {
  label: string
  value: number
}

export interface Debt {
  id: string
  debt_name: string
  monthly_payment: number
  remaining: string
  type: string
}

export interface Note {
  month: string
  note: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

// ─── API surface ──────────────────────────────────────────────────────────────
//
// Backed by Supabase (Postgres). Auth is still handled entirely by Firebase
// (see src/hooks/useAuth.ts) — this client uses the public anon key, and
// table access is governed by permissive RLS policies (see supabase/schema.sql).

export const api = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  listTransactions: async (): Promise<Transaction[]> =>
    unwrap(
      await supabase
        .from("transactions")
        .select("id, month, date, name, amount, type")
        .order("created_at", { ascending: true }),
    ),

  listByMonth: async (month: string): Promise<Transaction[]> =>
    unwrap(
      await supabase
        .from("transactions")
        .select("id, month, date, name, amount, type")
        .eq("month", month)
        .order("created_at", { ascending: true }),
    ),

  listDebts: async (): Promise<Debt[]> =>
    unwrap(
      await supabase
        .from("debts")
        .select("id, debt_name, monthly_payment, remaining, type")
        .order("created_at", { ascending: true }),
    ),

  getIncome: async (): Promise<IncomeRow[]> =>
    unwrap(await supabase.from("income").select("label, value")),

  getNote: async (month: string): Promise<Note | null> =>
    unwrap(
      await supabase.from("notes").select("month, note").eq("month", month).maybeSingle(),
    ),

  listMonths: async (): Promise<string[]> => {
    const rows = unwrap<{ month: string }[]>(
      await supabase
        .from("transactions")
        .select("month")
        .order("created_at", { ascending: true }),
    )
    const seen = new Set<string>()
    const months: string[] = []
    for (const { month } of rows) {
      if (month && !seen.has(month)) {
        seen.add(month)
        months.push(month)
      }
    }
    return months
  },

  // ── Writes ───────────────────────────────────────────────────────────────
  addTransaction: async (data: Omit<Transaction, "id">): Promise<Transaction> =>
    unwrap(await supabase.from("transactions").insert(data).select().single()),

  updateTransaction: async ({ id, ...rest }: Transaction): Promise<Transaction> =>
    unwrap(await supabase.from("transactions").update(rest).eq("id", id).select().single()),

  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) throw new Error(error.message)
  },

  addDebt: async (data: Omit<Debt, "id">): Promise<Debt> =>
    unwrap(await supabase.from("debts").insert(data).select().single()),

  updateDebt: async ({ id, ...rest }: Debt): Promise<Debt> =>
    unwrap(await supabase.from("debts").update(rest).eq("id", id).select().single()),

  deleteDebt: async (id: string): Promise<void> => {
    const { error } = await supabase.from("debts").delete().eq("id", id)
    if (error) throw new Error(error.message)
  },

  saveNote: async (month: string, note: string): Promise<Note> =>
    unwrap(
      await supabase
        .from("notes")
        .upsert({ month, note }, { onConflict: "month" })
        .select()
        .single(),
    ),
}
