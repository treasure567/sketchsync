import clsx from 'clsx'
import { EllipsisVertical, LogOut, Plus, Settings, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { boardFilters, type BoardFilter } from '@/components/dashboard/boardFilters'
import { ButtonLink } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { FREE_BOARD_LIMIT } from '@/lib/boards/store'
import { currentUser } from '@/lib/session'

type SidebarProps = {
  filter: BoardFilter
  /** Boards counted against the free plan. */
  boardCount: number
  onFilterChange: (filter: BoardFilter) => void
  /** Present when the sidebar is shown as a drawer on small screens. */
  onClose?: () => void
}

export function Sidebar({ filter, boardCount, onFilterChange, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)
  const used = Math.min(boardCount, FREE_BOARD_LIMIT)

  return (
    <div className="flex h-full flex-col bg-surface px-4 pt-5 pb-4">
      <div className="flex items-center justify-between px-2">
        <Logo />
        {onClose && (
          <button type="button" aria-label="Close menu" onClick={onClose} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-brand-50">
            <X className="size-5" />
          </button>
        )}
      </div>

      <ButtonLink to="/board/new" className="mt-6 w-full">
        <Plus className="size-4" />
        New board
      </ButtonLink>

      <nav aria-label="Boards" className="mt-5">
        <ul className="space-y-1">
          {boardFilters.map(({ id, label, icon: Icon }) => {
            const active = id === filter
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onFilterChange(id)}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active ? 'bg-brand-100 font-semibold text-brand-600' : 'text-ink-muted hover:bg-brand-50 hover:text-ink',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-lg bg-brand-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">
              {boardCount} of {FREE_BOARD_LIMIT} free boards
            </span>
            <button type="button" aria-disabled="true" title="Paid plans are coming soon" className="cursor-default font-semibold text-brand-600">
              Upgrade
            </button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-brand-100" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={FREE_BOARD_LIMIT} aria-label="Free boards used">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(used / FREE_BOARD_LIMIT) * 100}%` }} />
          </div>
        </div>

        <button type="button" aria-disabled="true" title="Settings are coming soon" className="flex w-full cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted">
          <Settings className="size-4" />
          Settings
        </button>

        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-white" aria-hidden="true">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{currentUser.name}</span>
            <span className="block truncate text-xs text-ink-subtle">{currentUser.handle}</span>
          </span>
          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-brand-50"
            >
              <EllipsisVertical className="size-4" />
            </button>
            {accountOpen && (
              <Menu
                label="Account"
                onClose={() => setAccountOpen(false)}
                className="absolute right-0 bottom-10"
                items={[{ label: 'Sign out', icon: LogOut, onSelect: () => navigate('/') }]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
