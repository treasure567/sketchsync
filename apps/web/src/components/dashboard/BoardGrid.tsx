import clsx from 'clsx'
import { useState } from 'react'
import { BoardCard, CreateBoardCard } from '@/components/dashboard/BoardCard'
import type { Board, BoardType } from '@/components/dashboard/sampleBoards'

const typeTabs: { id: BoardType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'whiteboard', label: 'Whiteboards' },
  { id: 'wireframe', label: 'Wireframes' },
  { id: 'diagram', label: 'Diagrams' },
]

type BoardGridProps = {
  title: string
  boards: Board[]
}

export function BoardGrid({ title, boards }: BoardGridProps) {
  const [type, setType] = useState<BoardType | 'all'>('all')
  const visible = type === 'all' ? boards : boards.filter((board) => board.type === type)

  return (
    <section aria-labelledby="boards-heading">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="boards-heading" className="text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-brand-600">
          {boards.length} {boards.length === 1 ? 'board' : 'boards'}
        </span>

        <div className="-mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:ml-auto sm:w-auto" role="group" aria-label="Board type">
          {typeTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={clsx(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                type === id ? 'bg-brand-500 text-white shadow-sm' : 'text-ink hover:bg-brand-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <li>
          <CreateBoardCard />
        </li>
        {visible.map((board) => (
          <li key={board.id}>
            <BoardCard board={board} />
          </li>
        ))}
      </ul>

      {visible.length === 0 && <p className="mt-6 text-center text-sm text-ink-muted">No boards here yet.</p>}
    </section>
  )
}
