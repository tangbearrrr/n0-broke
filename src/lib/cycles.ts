// ─── Billing cycle helpers (17th → 17th) ─────────────────────────────────────

export const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]

export interface CycleStart { year: number; month: number }

/**
 * Given a yyyy-mm-dd date string, return the billing cycle start.
 * Cycle: 17th of month M → 16th of month M+1.
 * day >= 17 → cycle starts this month
 * day <  17 → cycle starts previous month
 */
export function dateToCycleStart(dateStr: string): CycleStart {
  const [y, m, d] = dateStr.split("-").map(Number)
  if (d >= 17) return { year: y, month: m }
  const prevMonth = m === 1 ? 12 : m - 1
  const prevYear  = m === 1 ? y - 1 : y
  return { year: prevYear, month: prevMonth }
}

/** Sortable integer for a cycle: yyyymm */
export function cycleStartToSortable({ year, month }: CycleStart): number {
  return year * 100 + month
}

/** Display label: "17 MAR – 17 APR 26" */
export function cycleLabel({ year, month }: CycleStart): string {
  const startAbbr = MONTH_ABBR[month - 1]
  const endMonth  = month === 12 ? 1 : month + 1
  const endYear   = month === 12 ? year + 1 : year
  const endAbbr   = MONTH_ABBR[endMonth - 1]
  const yr        = String(endYear).slice(-2)
  return `17 ${startAbbr} – 17 ${endAbbr} ${yr}`
}

/** The month you receive the left-over: 2 months after cycle start (e.g. MAR cycle → MAY) */
export function cyclePayMonth({ year, month }: CycleStart): string {
  const payMonth = ((month - 1 + 2) % 12) + 1
  const payYear  = month >= 11 ? year + 1 : year
  const yr       = String(payYear).slice(-2)
  return `${MONTH_ABBR[payMonth - 1]} ${yr}`
}

/** Unique string key for a cycle: "2026-03" */
export function cycleKey({ year, month }: CycleStart): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** Strip time from any date string → yyyy-mm-dd, interpreted in GMT+7 (Thailand) */
export function toDateOnly(date: string | null | undefined): string {
  if (!date) return ""
  // If there is no time component (already yyyy-mm-dd), return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  // Convert to GMT+7 date string using Intl (handles DST-free fixed offset)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}
