/** Kyrgyz ram's-horn (кочкор мүйүз) divider: a spiral pair flanking a thin rule. Decorative. */
export function HornDivider({ className = "" }: { className?: string }) {
  const horn = (
    <path
      d="M0 12c0-6 4-9 8-9 5 0 7 4 5 7-2 3-6 2-6-1 0-2 2-3 3-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  );
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 text-gold-text ${className}`}>
      <span className="h-px w-16 bg-current opacity-40 sm:w-28" />
      <svg viewBox="0 0 64 24" className="h-6 w-16" role="presentation" focusable="false">
        <g transform="translate(1 0)">{horn}</g>
        <g transform="translate(63 0) scale(-1 1)">{horn}</g>
        <circle cx="32" cy="12" r="2" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-current opacity-40 sm:w-28" />
    </div>
  );
}
