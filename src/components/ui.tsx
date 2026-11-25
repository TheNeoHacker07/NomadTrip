export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-border/60 ${className}`} aria-busy="true" aria-label="Loading" />;
}

const difficultyStyle = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  challenging: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
} as const;

export function DifficultyBadge({ level }: { level: keyof typeof difficultyStyle }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${difficultyStyle[level]}`}>{level}</span>;
}

const statusStyle = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  cancelled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusStyle }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyle[status]}`}>{status}</span>;
}
