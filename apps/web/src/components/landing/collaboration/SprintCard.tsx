import clsx from 'clsx'
import { MessageSquareText } from 'lucide-react'
import type { CSSProperties } from 'react'

export type SprintStatus = 'shipped' | 'review' | 'planned'

const statusStyles: Record<
  SprintStatus,
  { label: string; card: string; sprint: string; body: string; chip: string }
> = {
  shipped: {
    label: 'Shipped',
    card: 'border border-[#f5c451] bg-sticky shadow-lg',
    sprint: 'text-[#b4610e]',
    body: 'text-[#7a5a1a]',
    chip: 'bg-accent-orange text-white',
  },
  review: {
    label: 'In Review',
    card: 'border-2 border-accent-teal bg-sticky shadow-lg outline-[1.5px] outline-offset-2 outline-accent-teal-line',
    sprint: 'text-[#b4610e]',
    body: 'text-[#7a5a1a]',
    chip: 'bg-accent-teal text-white',
  },
  planned: {
    label: 'Planned',
    card: 'border border-line bg-surface shadow-sm',
    sprint: 'text-ink-subtle',
    body: 'text-ink-muted',
    chip: 'bg-brand-50 text-ink-muted',
  },
}

type SprintCardProps = {
  sprint: string
  title: string
  description: string
  status: SprintStatus
  /** Show the comment badge pinned to the card's corner. */
  hasComments?: boolean
  className?: string
  style?: CSSProperties
}

/** Roadmap sticky card for one sprint. */
export function SprintCard({ sprint, title, description, status, hasComments, className, style }: SprintCardProps) {
  const styles = statusStyles[status]

  return (
    <div className={clsx('absolute flex flex-col rounded-lg p-4', styles.card, className)} style={style}>
      {hasComments && (
        <span className="absolute -top-2.5 -right-2.5 grid size-6 place-items-center rounded-full bg-accent-teal text-white shadow">
          <MessageSquareText className="size-3.5" />
        </span>
      )}

      <p className={clsx('text-[17px] font-bold tracking-wide', styles.sprint)}>{sprint}</p>
      <p className="mt-2 text-[13px] font-bold text-ink">{title}</p>
      <p className={clsx('mt-1.5 text-[11px] leading-snug', styles.body)}>{description}</p>

      <div className="mt-auto flex items-center justify-between border-t border-black/8 pt-2.5">
        <span className="text-[11px] text-ink-muted">Status</span>
        <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-semibold', styles.chip)}>{styles.label}</span>
      </div>
    </div>
  )
}
