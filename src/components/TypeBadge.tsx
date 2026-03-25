import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/api"

interface TypeBadgeProps {
  type: Transaction["type"]
  className?: string
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        type === "KTC"
          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        className
      )}
    >
      {type}
    </span>
  )
}
