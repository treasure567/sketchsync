import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BoardGrid } from '@/components/dashboard/BoardGrid'
import { boardFilters, type BoardFilter } from '@/components/dashboard/boardFilters'
import { EmptyBoards } from '@/components/dashboard/EmptyBoards'
import { type Board, sampleBoards } from '@/components/dashboard/sampleBoards'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TemplateGallery } from '@/components/dashboard/TemplateGallery'
import { TemplateStrip } from '@/components/dashboard/TemplateStrip'
import { TopBar, type BoardView } from '@/components/dashboard/TopBar'

function applyFilter(boards: Board[], filter: BoardFilter) {
  switch (filter) {
    case 'mine':
      return boards.filter((board) => board.role === 'owner')
    case 'shared':
      return boards.filter((board) => board.role !== 'owner')
    case 'starred':
      return boards.filter((board) => board.starred)
    case 'trash':
      return []
    default:
      return boards
  }
}

/*
 * Boards are not loaded from a server yet: the dashboard shows sample boards,
 * or its empty state when opened as /dashboard?empty.
 */
export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const boards = searchParams.has('empty') ? [] : sampleBoards
  const [filter, setFilter] = useState<BoardFilter>('all')
  const filterLabel = boardFilters.find(({ id }) => id === filter)?.label ?? 'All boards'
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
          {boards.length === 0 ? (
            <>
              <TemplateStrip />
              <div className="mx-auto max-w-4xl">
                <EmptyBoards />
              </div>
            </>
          ) : (
            <>
              <TemplateGallery />
              <BoardGrid key={filter} title={filterLabel} boards={applyFilter(boards, filter)} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
