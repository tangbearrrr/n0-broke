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

// ─── Transport ────────────────────────────────────────────────────────────────
//
// Google Apps Script Web Apps do NOT support CORS preflight (OPTIONS).
// Any fetch() with Content-Type: application/json triggers a preflight → blocked.
//
// Solution: route EVERYTHING through GET.
//   • Reads  → plain query params  (?action=listDebts&month=SEP)
//   • Writes → payload serialised as a single "payload" query param
//              (?action=addDebt&payload={"debt_name":"..."})
//
// GAS follows redirects automatically, so the deployed URL always works.

const BASE = import.meta.env.VITE_API_URL as string

/** Build a full URL with query params and fetch it (no preflight). */
async function gs<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error ?? "Unknown error")
  return json.data as T
}

/**
 * Mutation helper — still a GET, but serialises the body as a
 * single "payload" query-param so no preflight is triggered.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gsMut<T>(action: string, body: any): Promise<T> {
  return gs<T>({ action, payload: JSON.stringify(body) })
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  listTransactions: () =>
    gs<Transaction[]>({ action: "listTransactions" }),

  listByMonth: (month: string) =>
    gs<Transaction[]>({ action: "listByMonth", month }),

  listDebts: () =>
    gs<Debt[]>({ action: "listDebts" }),

  getIncome: () =>
    gs<IncomeRow[]>({ action: "getIncome" }),

  getNote: (month: string) =>
    gs<Note | null>({ action: "getNote", month }),

  listMonths: () => gs<string[]>({ action: "listMonths" }),

  // ── Writes (all go as GET + payload param) ─────────────────────────────────
  addTransaction: (data: Omit<Transaction, "id">) =>
    gsMut<Transaction>("addTransaction", data),

  updateTransaction: (data: Transaction) =>
    gsMut<Transaction>("updateTransaction", data),

  deleteTransaction: (id: string) =>
    gsMut<void>("deleteTransaction", { id }),

  addDebt: (data: Omit<Debt, "id">) =>
    gsMut<Debt>("addDebt", data),

  updateDebt: (data: Debt) =>
    gsMut<Debt>("updateDebt", data),

  deleteDebt: (id: string) =>
    gsMut<void>("deleteDebt", { id }),

  saveNote: (month: string, note: string) =>
    gsMut<Note>("saveNote", { month, note }),
}
