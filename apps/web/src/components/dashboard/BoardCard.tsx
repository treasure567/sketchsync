import clsx from 'clsx'
import { Copy, EllipsisVertical, ExternalLink, Pencil, Plus, RotateCcw, Star, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ElementsPreview } from '@/components/board/ElementsPreview'
import { Menu, type MenuEntry } from '@/components/ui/Menu'
import { deleteBoardForever, duplicateBoard, loadBoardElements, updateBoard, type BoardMeta } from '@/lib/boards/store'
import { Avatar } from '@/components/ui/Avatar'
import { useProfile } from '@/hooks/useProfile'
import { timeAgo } from '@/lib/time'

type BoardItemProps = {
  board: BoardMeta
  now: number
}

const typeLabels = { whiteboard: 'Whiteboard', wireframe: 'Wireframe', diagram: 'Diagram' }

/** Card menu and inline rename shared by the grid card and the list row. */
function useBoardActions(board: BoardMeta) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const trashed = board.trashedAt !== null

  const items: MenuEntry[] = trashed
    ? [
        { label: 'Restore', icon: RotateCcw, onSelect: () => updateBoard(board.id, { trashedAt: null }) },
        'separator',
        {
          label: 'Delete forever',
          icon: Trash2,
          danger: true,
          onSelect: () => {
            if (window.confirm(`Delete “${board.name}” forever? This cannot be undone.`)) deleteBoardForever(board.id)
          },
        },
      ]
    : [
        { label: 'Open', icon: ExternalLink, onSelect: () => navigate(`/board/${board.id}`) },
        { label: 'Rename', icon: Pencil, onSelect: () => setRenaming(true) },
        { label: 'Duplicate', icon: Copy, onSelect: () => duplicateBoard(board.id) },
        { label: board.starred ? 'Remove star' : 'Star', icon: Star, onSelect: () => updateBoard(board.id, { starred: !board.starred }) },
        'separator',
        { label: 'Move to trash', icon: Trash2, danger: true, onSelect: () => updateBoard(board.id, { trashedAt: Date.now(), starred: false }) },
      ]

  const menu = (
    <div className="relative z-10">
      <button
        type="button"
        aria-label={`More actions for ${board.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-brand-50 hover:text-ink"
      >
        <EllipsisVertical className="size-4" />
      </button>
      {menuOpen && <Menu label={`${board.name} actions`} items={items} onClose={() => setMenuOpen(false)} className="absolute top-8 right-0" />}
    </div>
  )

  const title = renaming ? (
    <input
      aria-label="Board name"
      autoFocus
      defaultValue={board.name}
      onFocus={(event) => event.target.select()}
      onBlur={(event) => {
        const name = event.target.value.trim()
        if (name && name !== board.name) updateBoard(board.id, { name })
        setRenaming(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') setRenaming(false)
      }}
      className="relative z-10 w-full rounded border border-brand-500 px-1 text-sm font-bold text-ink outline-none"
    />
  ) : trashed ? (
    <span>{board.name}</span>
  ) : (
    // Stretched link: the whole card opens the board.
    <Link to={`/board/${board.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
      {board.name}
    </Link>
  )

  return { menu, title, trashed }
}

function StarButton({ board, className }: { board: BoardMeta; className?: string }) {
  if (board.trashedAt !== null) return null
  return (
    <button
      type="button"
      aria-label={board.starred ? `Unstar ${board.name}` : `Star ${board.name}`}
      aria-pressed={board.starred}
      onClick={() => updateBoard(board.id, { starred: !board.starred })}
      className={clsx(
        'z-10 grid size-7 place-items-center rounded-md',
        board.starred ? 'bg-sticky text-accent-orange' : 'bg-surface text-ink-muted shadow-sm hover:text-ink',
        className,
      )}
    >
      <Star className={clsx('size-3.5', board.starred && 'fill-current')} />
    </button>
  )
}

/** Rendered with key={board.updatedAt}, so it re-reads the content whenever the board is saved. */
function BoardThumbnail({ board, className }: { board: BoardMeta; className?: string }) {
  const [elements] = useState(() => loadBoardElements(board.id))
  if (elements.length === 0) {
    return <div className={clsx('grid place-items-center font-hand text-lg text-ink-subtle', className)}>Empty board</div>
  }
  return <ElementsPreview elements={elements} className={className} padding={16} />
}

export function BoardCard({ board, now }: BoardItemProps) {
  const { menu, title, trashed } = useBoardActions(board)
  const profile = useProfile()
  const shared = board.share.invites.length

  return (
    <article className={clsx('group relative flex flex-col rounded-2xl border border-line bg-surface shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md', trashed && 'opacity-80')}>
      <div className="relative h-40 overflow-hidden rounded-t-2xl bg-[#f6f6fb]">
        <BoardThumbnail key={board.updatedAt} board={board} className="h-full" />
        <span className="absolute top-3 left-3 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">
          {board.elementCount} {board.elementCount === 1 ? 'element' : 'elements'}
        </span>
        <StarButton board={board} className="absolute top-3 right-3" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{title}</h3>
          <div className="-mr-1.5">{menu}</div>
        </div>
        <p className="mt-0.5 text-xs text-ink-subtle">{trashed ? `Trashed ${timeAgo(board.trashedAt!, now)}` : `Edited ${timeAgo(board.updatedAt, now)}`}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span title={profile.name}>
              <Avatar name={profile.name} src={profile.avatar} className="size-7 text-[9px] ring-2 ring-surface" />
            </span>
            {shared > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-ink-muted" title={`${shared} invited`}>
                <Users className="size-3.5" />
                {shared}
              </span>
            )}
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-semibold text-brand-700">Owner</span>
        </div>
      </div>
    </article>
  )
}

export function BoardRow({ board, now }: BoardItemProps) {
  const { menu, title, trashed } = useBoardActions(board)
  return (
    <li className="relative flex items-center gap-4 rounded-xl border border-line bg-surface p-2 pr-3 shadow-sm hover:shadow-md">
      <BoardThumbnail key={board.updatedAt} board={board} className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f6f6fb]" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-ink">{title}</h3>
        <p className="text-xs text-ink-subtle">
          {typeLabels[board.type]} · {board.elementCount} elements
        </p>
      </div>
      <span className="text-xs text-ink-muted max-sm:hidden">{trashed ? `Trashed ${timeAgo(board.trashedAt!, now)}` : `Edited ${timeAgo(board.updatedAt, now)}`}</span>
      <StarButton board={board} className="relative" />
      {menu}
    </li>
  )
}

export function CreateBoardCard() {
  return (
    <Link
      to="/board/new"
      className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-brand-100 bg-brand-50/70 p-6 text-center transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
