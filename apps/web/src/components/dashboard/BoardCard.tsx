import clsx from 'clsx'
import { EllipsisVertical, Plus, Star } from 'lucide-react'
import { Link } from 'react-router'
import { BoardThumbnail } from '@/components/dashboard/BoardThumbnail'
import type { Board, BoardRole } from '@/components/dashboard/sampleBoards'

const avatarColors: Record<string, string> = {
  AL: 'bg-brand-500',
  MV: 'bg-linear-to-br from-accent-orange to-accent-red',
  CO: 'bg-[#a16207]',
  ER: 'bg-accent-teal',
  PK: 'bg-[#b45309]',
  SC: 'bg-[#f0475e]',
  LK: 'bg-[#f59e0b]',
  KT: 'bg-accent-green',
}

const roleStyles: Record<BoardRole, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-brand-100 text-brand-700' },
  editor: { label: 'Editor', className: 'bg-[#c9f2e3] text-accent-teal' },
  viewer: { label: 'Viewer', className: 'bg-[#e8e8f1] text-ink-muted' },
}

function AvatarStack({ initials, more }: { initials: string[]; more?: number }) {
  return (
    <div className="flex -space-x-1">
      {initials.map((person) => (
        <span
          key={person}
          className={clsx('grid size-7 place-items-center rounded-full text-[9px] font-bold text-white ring-2 ring-surface', avatarColors[person] ?? 'bg-ink-muted')}
        >
          {person}
        </span>
      ))}
      {more ? (
        <span className="grid size-7 place-items-center rounded-full bg-brand-50 text-[9px] font-semibold text-ink-muted ring-2 ring-surface">
          +{more}
        </span>
      ) : null}
    </div>
  )
}

export function BoardCard({ board }: { board: Board }) {
  const role = roleStyles[board.role]

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative h-40 bg-[#f6f6fb]">
        <BoardThumbnail kind={board.thumbnail} />

        {board.activeNow ? (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">
            <span className="size-1.5 rounded-full bg-accent-green" />
            Live · {board.activeNow} active
          </span>
        ) : board.tag ? (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">{board.tag}</span>
        ) : null}

        <button
          type="button"
          aria-label={board.starred ? `Unstar ${board.name}` : `Star ${board.name}`}
          aria-pressed={board.starred}
          className={clsx(
            'absolute top-3 right-3 z-10 grid size-6 place-items-center rounded-md shadow-sm',
            board.starred ? 'bg-sticky text-accent-orange' : 'bg-surface text-ink-muted hover:text-ink',
          )}
        >
          <Star className={clsx('size-3.5', board.starred && 'fill-current')} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-bold text-ink">
            {/* Stretched link: the whole card opens the board */}
            <Link to="/board" className="after:absolute after:inset-0 focus-visible:outline-none">
              {board.name}
            </Link>
          </h3>
          <button type="button" aria-label={`More actions for ${board.name}`} className="relative z-10 -mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-brand-50">
            <EllipsisVertical className="size-4" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-subtle">{board.edited}</p>

        <div className="mt-4 flex items-center justify-between">
          <AvatarStack initials={board.collaborators} more={board.moreCollaborators} />
          <span className={clsx('rounded-full px-3 py-1 text-[11px] font-semibold', role.className)}>{role.label}</span>
        </div>
      </div>
    </article>
  )
}

export function CreateBoardCard() {
  return (
    <Link
      to="/board"
      className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50/70 p-6 text-center transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-surface text-brand-600 shadow-sm">
        <Plus className="size-6" />
      </span>
      <span className="mt-4 text-xl leading-tight font-bold text-ink">Create new board</span>
      <span className="mt-1.5 text-xs text-ink-muted">Start with an empty canvas</span>
      <span className="mt-6 font-hand text-lg leading-tight font-semibold text-brand-600" aria-hidden="true">
        boundless ideas
        <br />
        start here
      </span>
    </Link>
  )
}
