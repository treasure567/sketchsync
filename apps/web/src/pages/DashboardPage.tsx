import { useEffect, useState } from 'react'
import type { BoardFilter } from '@/components/dashboard/boardFilters'
import { EmptyBoards } from '@/components/dashboard/EmptyBoards'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TemplateStrip } from '@/components/dashboard/TemplateStrip'
import { TopBar, type BoardView } from '@/components/dashboard/TopBar'

/*
 * Boards are not loaded from anywhere yet, so the dashboard always shows its
 * empty state.
 */
export function DashboardPage() {
  const [filter, setFilter] = useState<BoardFilter>('all')
  const [view, setView] = useState<BoardView>('grid')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line lg:block">
        <Sidebar filter={filter} onFilterChange={setFilter} />
      </aside>

      {/* Drawer for small screens */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setMenuOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl">
            <Sidebar
              filter={filter}
              onFilterChange={(next) => {
                setFilter(next)
                setMenuOpen(false)
              }}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onViewChange={setView} onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <TemplateStrip />
          <div className="mx-auto max-w-4xl">
            <EmptyBoards />
          </div>
        </main>
      </div>
    </div>
  )
}
