import clsx from 'clsx'
import { ArrowRight, ChevronDown, Circle, File, Hand, Image, MousePointer2, Pencil, Square, Type } from 'lucide-react'

const groups = [
  [MousePointer2, Hand, Pencil, Square, Circle, ArrowRight],
  [File, Type, Image],
]

export function PreviewToolbar({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-md', className)}>
      {groups.map((icons, groupIndex) => (
        <div key={groupIndex} className="flex items-center gap-0.5">
          {groupIndex > 0 && <span className="mx-1.5 h-5 w-px bg-line" />}
          {icons.map((Icon, index) => {
            const active = groupIndex === 0 && index === 0
            return (
              <span
                key={index}
                className={clsx('grid size-8 place-items-center rounded-lg', active ? 'bg-brand-100 text-brand-600' : 'text-ink')}
              >
                <Icon className={clsx('size-[17px]', active && 'fill-current')} strokeWidth={1.8} />
              </span>
            )
          })}
        </div>
      ))}
      <span className="mx-1.5 h-5 w-px bg-line" />
      <span className="flex items-center gap-0.5 px-1.5 font-mono text-xs font-medium text-ink">
        100%
        <ChevronDown className="size-3.5" />
      </span>
    </div>
  )
}
