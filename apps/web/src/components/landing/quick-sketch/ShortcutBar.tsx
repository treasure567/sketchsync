import clsx from 'clsx'
import { Fragment } from 'react'
import { Kbd } from '@/components/ui/Kbd'

const shortcuts = [
  { key: 'V', label: 'Select' },
  { key: 'H', label: 'Hand/Pan' },
  { key: 'Space', label: 'Hold to Drag' },
  { key: '⌘Z', label: 'Undo' },
]

export function ShortcutBar({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2.5 rounded-full border border-line bg-surface px-3 py-1.5 shadow-sm', className)}>
      {shortcuts.map(({ key, label }, index) => (
        <Fragment key={key}>
          {index > 0 && <span className="size-0.5 rounded-full bg-ink-subtle" />}
          <span className="flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap text-ink-muted">
            <Kbd>{key}</Kbd>
            {label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
