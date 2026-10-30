import clsx from 'clsx'
import { Library, Menu as MenuIcon, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Menu, type MenuEntry } from '@/components/ui/Menu'
import { currentUser } from '@/lib/session'

export type SaveStatus = 'saved' | 'saving'

type BoardHeaderProps = {
  title: string
  onRename: (title: string) => void
  saveStatus: SaveStatus
  menuItems: MenuEntry[]
  libraryOpen: boolean
  onToggleLibrary: () => void
  shareCount: number
  onShare: () => void
}

const floatingButton = 'grid size-9 place-items-center rounded-lg bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-brand-50'

function BoardTitle({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <button type="button" onClick={() => setDraft(title)} title="Rename board" className="max-w-56 truncate rounded px-1 font-medium text-ink hover:bg-brand-50">
        {title}
      </button>
    )
  }

  const commit = () => {
    const name = draft.trim()
    if (name && name !== title) onRename(name)
    setDraft(null)
  }

  return (
    <input
      aria-label="Board name"
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') setDraft(null)
      }}
      className="w-48 rounded border border-brand-500 bg-surface px-1 font-medium text-ink outline-none"
    />
  )
}

/** Main menu, board title and save state on the left; library, sharing and account on the right. */
export function BoardHeader({ title, onRename, saveStatus, menuItems, libraryOpen, onToggleLibrary, shareCount, onShare }: BoardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="pointer-events-auto relative flex items-center gap-3">
        <button type="button" aria-label="Main menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className={floatingButton}>
          <MenuIcon className="size-[18px]" />
        </button>
        {menuOpen && <Menu label="Main menu" items={menuItems} onClose={() => setMenuOpen(false)} className="absolute top-11 left-0" />}
        <div className="flex items-center gap-2 text-xs max-sm:hidden">
          <BoardTitle title={title} onRename={onRename} />
          <span className="flex items-center gap-1 text-ink-muted" role="status">
            <span className={clsx('size-1.5 rounded-full', saveStatus === 'saved' ? 'bg-accent-green' : 'bg-accent-orange')} />
            {saveStatus === 'saved' ? 'Saved' : 'Saving…'}
          </span>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onShare}
          className="flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3.5 text-xs font-semibold text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 hover:bg-brand-600"
        >
          <Share2 className="size-3.5" />
          Share
          {shareCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-white/25 px-1 text-[10px]">{shareCount}</span>}
        </button>
        <button
          type="button"
          aria-label="Library"
          title="Library"
          aria-pressed={libraryOpen}
          onClick={onToggleLibrary}
          className={clsx(floatingButton, libraryOpen && 'bg-brand-100 text-brand-600')}
        >
          <Library className="size-[18px]" />
        </button>
        <span className="flex h-9 items-center gap-2 rounded-lg px-1.5" title={currentUser.name}>
          <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">{currentUser.initials}</span>
          <span className="text-xs font-medium text-ink max-md:hidden">{currentUser.name}</span>
        </span>
      </div>
    </>
  )
}
