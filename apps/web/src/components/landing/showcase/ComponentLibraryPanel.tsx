import clsx from 'clsx'
import { Circle, Gem, SlidersHorizontal, Square } from 'lucide-react'

const stencils = ['Button', 'Input Box', 'Modal', 'Card Grid', 'Avatar', 'Badge']
const shapes = [Square, Circle, Gem]

export function ComponentLibraryPanel({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-4 shadow-lg', className)}>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <p className="text-[15px] font-semibold tracking-wide text-ink">COMPONENT LIBRARY</p>
        <SlidersHorizontal className="size-4 text-ink" />
      </div>

      <p className="mt-3.5 mb-2.5 text-xs font-bold text-ink">UI Stencils</p>
      <div className="grid grid-cols-2 gap-2">
        {stencils.map((stencil) => (
          <span key={stencil} className="rounded-md bg-brand-50 py-2.5 text-center text-xs text-ink-muted">
            {stencil}
          </span>
        ))}
      </div>

      <p className="mt-5 mb-2.5 text-xs font-bold text-ink">Connectors &amp; Shapes</p>
      <div className="grid grid-cols-3 gap-2">
        {shapes.map((Shape, index) => (
          <span key={index} className="grid place-items-center rounded-md bg-brand-50 py-2.5 text-ink">
            <Shape className="size-3.5" strokeWidth={1.8} />
          </span>
        ))}
      </div>
    </div>
  )
}
