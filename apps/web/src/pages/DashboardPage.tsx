import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ShortcutsDialog } from '@/components/board/ShortcutsDialog'
import { BoardGrid } from '@/components/dashboard/BoardGrid'
import { boardFilters, type BoardFilter } from '@/components/dashboard/boardFilters'
import { EmptyBoards } from '@/components/dashboard/EmptyBoards'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TemplateGallery } from '@/components/dashboard/TemplateGallery'
import { TemplatesDialog } from '@/components/dashboard/TemplatesDialog'
import { TemplateStrip } from '@/components/dashboard/TemplateStrip'
import { TopBar, type BoardSort, type BoardView } from '@/components/dashboard/TopBar'
import { useBoards } from '@/hooks/useBoards'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { BoardMeta } from '@/lib/boards/store'

const RECENT_DAYS = 14

function filterBoards(boards: BoardMeta[], filter: BoardFilter, now: number) {
  const active = boards.filter((board) => board.trashedAt === null)
  switch (filter) {
    case 'trash':
      return boards.filter((board) => board.trashedAt !== null)
    case 'starred':
      return active.filter((board) => board.starred)
    case 'recent':
      return active.filter((board) => now - board.openedAt < RECENT_DAYS * 24 * 60 * 60 * 1000)
    case 'shared':
      // Boards from other people arrive with the sync server.
      return []
    default:
      return active
  }
}

const sorters: Record<BoardSort, (a: BoardMeta, b: BoardMeta) => number> = {
  edited: (a, b) => b.updatedAt - a.updatedAt,
  opened: (a, b) => b.openedAt - a.openedAt,
  name: (a, b) => a.name.localeCompare(b.name),
  created: (a, b) => b.createdAt - a.createdAt,
}

const emptyMessages: Record<BoardFilter, string> = {
  all: 'No boards yet.',
  mine: 'You haven’t created any boards yet.',
  shared: 'Boards other people share with you will appear here.',
  recent: 'Boards you open will appear here.',
  starred: 'Star a board to keep it here.',
  trash: 'Trash is empty.',
}

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const boards = useBoards()
  const [searchParams] = useSearchParams()
  const [now, setNow] = useState(() => Date.now())
  const [filter, setFilter] = useState<BoardFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<BoardSort>('edited')
  const [view, setView] = useState<BoardView>('grid')
  const [menuOpen, setMenuOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(() => searchParams.has('templates'))
  const [helpOpen, setHelpOpen] = useState(false)

  // Keep "Edited 5m ago" labels fresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  const activeCount = boards.filter((board) => board.trashedAt === null).length
  const query = search.trim().toLowerCase()
  const visible = filterBoards(boards, filter, now)
    .filter((board) => !query || board.name.toLowerCase().includes(query))
    .sort(filter === 'recent' && sort === 'edited' ? sorters.opened : sorters[sort])
  const filterLabel = boardFilters.find(({ id }) => id === filter)?.label ?? 'All boards'
  const showEmptyState = activeCount === 0 && filter === 'all' && !query

  const sidebar = (onClose?: () => void) => (
    <Sidebar
      filter={filter}
      boardCount={activeCount}
      onFilterChange={(next) => {
        setFilter(next)
        onClose?.()
      }}
      onClose={onClose}
    />
  )

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line lg:block">{sidebar()}</aside>

      {/* Drawer for small screens */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setMenuOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl">{sidebar(() => setMenuOpen(false))}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
          onOpenMenu={() => setMenuOpen(true)}
          onHelp={() => setHelpOpen(true)}
        />
        <main className="flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          {showEmptyState ? (
            <>
              <TemplateStrip onBrowseAll={() => setTemplatesOpen(true)} />
              <div className="mx-auto max-w-4xl">
                <EmptyBoards onBrowseTemplates={() => setTemplatesOpen(true)} />
              </div>
            </>
          ) : (
            <>
              {filter !== 'trash' && <TemplateGallery onBrowseAll={() => setTemplatesOpen(true)} />}
              <BoardGrid
                key={filter}
                title={query ? `Results for “${search.trim()}”` : filterLabel}
                boards={visible}
                view={view}
                now={now}
                canCreate={filter !== 'trash' && filter !== 'shared' && !query}
                emptyMessage={query ? 'No boards match your search.' : emptyMessages[filter]}
              />
            </>
          )}
        </main>
      </div>

      {templatesOpen && <TemplatesDialog onClose={() => setTemplatesOpen(false)} />}
      {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
