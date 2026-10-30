import clsx from 'clsx'
import { ArrowRight, Gem, Lightbulb, Pencil, Search, Square, StickyNote, Type } from 'lucide-react'
import { Kbd } from '@/components/ui/Kbd'

const tools = [
  { icon: Pencil, label: 'Pencil Tool', key: 'P' },
  { icon: Square, label: 'Rectangle', key: 'R' },
  { icon: Gem, label: 'Diamond Node', key: 'D' },
  { icon: ArrowRight, label: 'Arrow Connector', key: 'A' },
  { icon: Type, label: 'Text Annotation', key: 'T' },
  { icon: StickyNote, label: 'Sticky Note', key: 'S' },
]

export function CommandPalette({ className }: { className?: string }) {
  return (
    <div className={clsx('flex flex-col rounded-xl border border-line bg-surface p-3 shadow-xl', className)}>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-brand-50/60 px-3 py-2">
        <Search className="size-3.5 text-ink" />
        <span className="flex-1 text-xs text-ink">Pencil</span>
        <Kbd>ESC</Kbd>
      </div>

      <p className="mt-4 mb-2 px-1 text-[10px] font-bold tracking-wider text-ink-muted">DRAWING TOOLS</p>
      <ul className="space-y-1">
        {tools.map(({ icon: Icon, label, key }, index) => {
          const active = index === 0
          return (
            <li
              key={label}
              className={clsx(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs',
                active ? 'bg-brand-100 font-semibold text-brand-600' : 'text-ink',
              )}
            >
              <Icon className="size-3.5" />
              <span className="flex-1">{label}</span>
              <Kbd className={active ? 'bg-surface' : undefined}>{key}</Kbd>
            </li>
          )
        })}
      </ul>

      <p className="mt-auto flex gap-2 rounded-lg bg-brand-50 p-3 text-[11px] leading-snug text-ink-muted">
        <Lightbulb className="size-3.5 shrink-0 text-brand-500" />
        Press any letter key anytime to switch tools.
      </p>
    </div>
  )
}
