import clsx from 'clsx'
import { EllipsisVertical, Plus, Settings, UserRound, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { boardFilters, type BoardFilter } from '@/components/dashboard/boardFilters'
import { ButtonLink } from '@/components/ui/Button'

type SidebarProps = {
  filter: BoardFilter
  onFilterChange: (filter: BoardFilter) => void
  /** Present when the sidebar is shown as a drawer on small screens. */
  onClose?: () => void
}

export function Sidebar({ filter, onFilterChange, onClose }: SidebarProps) {
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

      <ButtonLink to="/board" className="mt-6 w-full">
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
            <span className="text-ink-muted">3 of 10 free boards</span>
            <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">
              Upgrade
            </a>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-brand-100" role="progressbar" aria-valuenow={3} aria-valuemin={0} aria-valuemax={10} aria-label="Free boards used">
            <div className="h-full w-[30%] rounded-full bg-brand-500" />
          </div>
        </div>

        <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:bg-brand-50 hover:text-ink">
          <Settings className="size-4" />
          Settings
        </button>

        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-white" aria-hidden="true">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">Teslim Balogun</span>
            <span className="block truncate text-xs text-ink-subtle">@teslim_baloo</span>
          </span>
          <button type="button" aria-label="Account menu" className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-brand-50">
            <EllipsisVertical className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
