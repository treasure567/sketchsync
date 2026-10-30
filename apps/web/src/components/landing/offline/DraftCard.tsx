import clsx from 'clsx'

/** A frame drawn while offline, waiting to sync. */
export function DraftCard({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'flex flex-col rounded-xl border-2 border-dashed border-[#f5c451] bg-surface p-4 shadow-[0_18px_40px_-20px_rgba(18,18,42,0.35)]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-bold text-ink">Draft Layout #4</p>
        <span className="rounded bg-sticky px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#8a5a0b]">Pending Sync</span>
      </div>

      <div className="relative mt-3.5 h-[124px] rounded-lg border border-[#f6e3c1] bg-[#fdf5e6]">
        <svg viewBox="0 0 240 124" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
          <path
            d="M62 58 C 80 30, 110 30, 132 52 S 170 80, 192 48"
            stroke="#d9780f"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <path
            d="M60 66 C 82 92, 112 90, 134 66 S 168 40, 186 62"
            stroke="#d9780f"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute right-4 bottom-3 -rotate-6 font-hand text-sm font-semibold text-sticky-ink">new hero idea</span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 text-[11px]">
        <span className="text-ink-muted">Auto-save: just now</span>
        <span className="font-medium text-brand-600">Review local diff →</span>
      </div>
    </div>
  )
}
