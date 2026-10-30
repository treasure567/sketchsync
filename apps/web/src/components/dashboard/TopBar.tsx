import clsx from 'clsx'
import { Bell, ChevronDown, CircleHelp, LayoutGrid, List, Menu, Search } from 'lucide-react'

export type BoardView = 'grid' | 'list'

type TopBarProps = {
  view: BoardView
  onViewChange: (view: BoardView) => void
  onOpenMenu: () => void
}

const iconButton = 'grid size-9 place-items-center rounded-lg text-ink hover:bg-brand-50'

export function TopBar({ view, onViewChange, onOpenMenu }: TopBarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
      <button type="button" aria-label="Open menu" onClick={onOpenMenu} className={clsx(iconButton, 'lg:hidden')}>
        <Menu className="size-5" />
      </button>

      <label className="flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Search boards, tags, or team members..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-brand-50 max-sm:hidden"
        >
          Last edited
          <ChevronDown className="size-3.5" />
        </button>

        <div className="flex rounded-lg border border-line bg-surface p-0.5 max-sm:hidden" role="group" aria-label="Board layout">
          {(
            [
              { id: 'grid', label: 'Grid view', icon: LayoutGrid },
              { id: 'list', label: 'List view', icon: List },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={clsx(
                'grid size-8 place-items-center rounded-md transition-colors',
                view === id ? 'bg-brand-100 text-brand-600' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        <button type="button" aria-label="Notifications" className={iconButton}>
          <Bell className="size-[18px]" />
        </button>
        <button type="button" aria-label="Help" className={iconButton}>
          <CircleHelp className="size-[18px]" />
        </button>
      </div>
    </header>
  )
}
