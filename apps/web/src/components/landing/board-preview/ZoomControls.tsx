import clsx from 'clsx'
import { Minus, Plus, Scan } from 'lucide-react'

export function ZoomControls({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-ink shadow-sm', className)}>
      <Minus className="size-3.5" />
      <span className="font-mono text-[11px] font-semibold">100%</span>
      <Plus className="size-3.5" />
      <span className="h-4 w-px bg-line" />
      <Scan className="size-3.5" />
    </div>
  )
}
