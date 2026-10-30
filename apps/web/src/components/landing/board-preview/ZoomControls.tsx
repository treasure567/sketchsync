import clsx from 'clsx'
import { Minus, Plus, Scan, type LucideIcon } from 'lucide-react'

type ZoomControlsProps = {
  zoom?: number
  /** Icon after the divider, e.g. fit-to-screen or minimap. */
  icon?: LucideIcon
  className?: string
}

export function ZoomControls({ zoom = 100, icon: Icon = Scan, className }: ZoomControlsProps) {
  return (
    <div className={clsx('flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-ink shadow-sm', className)}>
      <Minus className="size-3.5" />
      <span className="font-mono text-[11px] font-semibold">{zoom}%</span>
      <Plus className="size-3.5" />
      <span className="h-4 w-px bg-line" />
      <Icon className="size-3.5" />
    </div>
  )
}
