import clsx from 'clsx'
import { EllipsisVertical, Lock, LockOpen, Sparkles } from 'lucide-react'
import { tools } from '@/components/board/tools'
import type { Tool } from '@/lib/board/types'

type ToolbarProps = {
  tool: Tool
  locked: boolean
  onToolChange: (tool: Tool) => void
  onToggleLock: () => void
  className?: string
}

const buttonBase =
  'grid size-8 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500'

export function Toolbar({ tool, locked, onToolChange, onToggleLock, className }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className={clsx('scrollbar-none flex items-center gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-md', className)}
    >
      <button
        type="button"
        aria-label={locked ? 'Unlock tool (tool stays active after drawing)' : 'Lock tool (keep the tool active after drawing)'}
        title={locked ? 'Tool locked — Q' : 'Keep tool active — Q'}
        aria-pressed={locked}
        onClick={onToggleLock}
        className={clsx(buttonBase, locked ? 'bg-brand-100 text-brand-600' : 'text-ink hover:bg-brand-50')}
      >
        {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
      </button>

      {tools.map(({ id, label, shortcut, icon: Icon, comingSoon }) => {
        const active = tool === id
        return (
          <button
            key={id}
            type="button"
            aria-label={comingSoon ? `${label} (coming soon)` : label}
            title={comingSoon ? `${label} — coming soon` : `${label} — ${shortcut}`}
            aria-pressed={active}
            aria-disabled={comingSoon}
            onClick={() => !comingSoon && onToolChange(id)}
            className={clsx(buttonBase, active ? 'bg-brand-100 text-brand-600' : 'text-ink hover:bg-brand-50', comingSoon && 'cursor-default')}
          >
            <Icon className={clsx('size-4', active && id === 'select' && 'fill-current')} />
          </button>
        )
      })}

      <span className="mx-1 h-5 w-px shrink-0 bg-line" />
      <button type="button" aria-label="AI assistant (coming soon)" title="AI assistant — coming soon" className={clsx(buttonBase, 'bg-brand-100 text-brand-600')}>
        <Sparkles className="size-4" />
      </button>
      <button type="button" aria-label="More tools" title="More tools" className={clsx(buttonBase, 'text-ink hover:bg-brand-50')}>
        <EllipsisVertical className="size-4" />
      </button>
    </div>
  )
}
