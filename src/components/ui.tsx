export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-border/60 ${className}`} aria-busy="true" />;
}

const difficultyStyle = {
  easy: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
  moderate: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
  challenging: "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100",
} as const;

export function DifficultyBadge({ level, label }: { level: keyof typeof difficultyStyle; label: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyStyle[level]}`}>{label}</span>;
}

const statusStyle = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
  confirmed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
  cancelled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

export function StatusBadge({ status, label }: { status: keyof typeof statusStyle; label: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{label}</span>;
}
