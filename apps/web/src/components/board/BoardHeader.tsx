import clsx from 'clsx'
import { ChevronDown, Library, Menu, Share2 } from 'lucide-react'
import { Link } from 'react-router'

export type SaveStatus = 'saved' | 'saving'

type BoardHeaderProps = {
  title: string
  saveStatus: SaveStatus
}

const floatingButton = 'grid size-9 place-items-center rounded-lg bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-brand-50'

/** Board title on the left and sharing and account controls on the right. */
export function BoardHeader({ title, saveStatus }: BoardHeaderProps) {
  return (
    <>
      <div className="pointer-events-auto flex items-center gap-3">
        <Link to="/dashboard" aria-label="Back to dashboard" title="Back to dashboard" className={floatingButton}>
          <Menu className="size-[18px]" />
        </Link>
        <div className="flex items-center gap-2 text-xs max-sm:hidden">
          <span className="font-medium text-ink">{title}</span>
          <span className="flex items-center gap-1 text-ink-muted" role="status">
            <span className={clsx('size-1.5 rounded-full', saveStatus === 'saved' ? 'bg-accent-green' : 'bg-accent-orange')} />
            {saveStatus === 'saved' ? 'Saved' : 'Saving…'}
          </span>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 hover:bg-brand-600"
        >
          <Share2 className="size-3.5" />
          Share
        </button>
        <button type="button" aria-label="Library" title="Library" className={clsx(floatingButton, 'max-sm:hidden')}>
          <Library className="size-[18px]" />
        </button>
        <button type="button" className="flex h-9 items-center gap-2 rounded-lg px-1.5 hover:bg-brand-50" aria-label="Account: Alex Lin">
          <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">AL</span>
          <span className="text-xs font-medium text-ink max-md:hidden">Alex Lin</span>
          <ChevronDown className="size-3.5 text-ink-muted max-md:hidden" />
        </button>
      </div>
    </>
  )
}
