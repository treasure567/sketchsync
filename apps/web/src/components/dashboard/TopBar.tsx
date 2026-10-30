import clsx from 'clsx'
import { Bell, ChevronDown, CircleHelp, LayoutGrid, List, Menu as MenuIcon, Search } from 'lucide-react'
import { useState } from 'react'
import { Menu } from '@/components/ui/Menu'

export type BoardView = 'grid' | 'list'
export type BoardSort = 'edited' | 'opened' | 'name' | 'created'

const sortLabels: Record<BoardSort, string> = {
  edited: 'Last edited',
  opened: 'Last opened',
  name: 'Name A–Z',
  created: 'Date created',
}

type TopBarProps = {
  search: string
  onSearchChange: (search: string) => void
  sort: BoardSort
  onSortChange: (sort: BoardSort) => void
  view: BoardView
  onViewChange: (view: BoardView) => void
  onOpenMenu: () => void
  onHelp: () => void
}

const iconButton = 'grid size-9 place-items-center rounded-lg text-ink hover:bg-brand-50'

export function TopBar({ search, onSearchChange, sort, onSortChange, view, onViewChange, onOpenMenu, onHelp }: TopBarProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
      <button type="button" aria-label="Open menu" onClick={onOpenMenu} className={clsx(iconButton, 'lg:hidden')}>
        <MenuIcon className="size-5" />
      </button>

      <label className="flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="sr-only">Search boards</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search boards, tags, or team members..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative max-sm:hidden">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((open) => !open)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink hover:bg-brand-50"
          >
            {sortLabels[sort]}
            <ChevronDown className="size-3.5" />
          </button>
          {sortOpen && (
            <Menu
              label="Sort boards"
              onClose={() => setSortOpen(false)}
              className="absolute top-11 right-0"
              items={(Object.keys(sortLabels) as BoardSort[]).map((option) => ({ label: sortLabels[option], checked: option === sort, onSelect: () => onSortChange(option) }))}
            />
          )}
        </div>

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
              className={clsx('grid size-8 place-items-center rounded-md transition-colors', view === id ? 'bg-brand-100 text-brand-600' : 'text-ink-muted hover:text-ink')}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>

        <div className="relative">
          <button type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className={iconButton}>
            <Bell className="size-[18px]" />
          </button>
          {notificationsOpen && (
            <Menu
              label="Notifications"
              onClose={() => setNotificationsOpen(false)}
              className="absolute top-11 right-0 w-64"
              items={[{ label: 'You’re all caught up — mentions and invites will appear here.', onSelect: () => {} }]}
            />
          )}
        </div>
        <button type="button" aria-label="Help and keyboard shortcuts" onClick={onHelp} className={iconButton}>
          <CircleHelp className="size-[18px]" />
        </button>
      </div>
    </header>
  )
}
