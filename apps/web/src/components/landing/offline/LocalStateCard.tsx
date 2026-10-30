import clsx from 'clsx'
import { CirclePause } from 'lucide-react'

const rows = [
  { label: 'Buffered strokes:', value: '12 ops', className: 'font-bold text-ink' },
  { label: 'Conflict resolution:', value: 'Yjs CRDT Auto', className: 'font-bold text-accent-green' },
  { label: 'Storage:', value: '1.2 MB cached', className: 'text-ink' },
]

/** Status of the edits held on this device while offline. */
export function LocalStateCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-3.5 shadow-lg', className)}>
      <p className="flex items-center gap-2 text-xs font-bold text-ink">
        <CirclePause className="size-4 text-accent-orange" />
        Local-First State (IndexedDB)
      </p>
      <dl className="mt-2.5 space-y-1.5">
        {rows.map(({ label, value, className: valueClassName }) => (
          <div key={label} className="flex items-center justify-between text-[11px]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className={clsx('font-mono', valueClassName)}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
