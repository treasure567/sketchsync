import clsx from 'clsx'
import { GripVertical, Library, MessageSquare, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { ElementsPreview } from '@/components/board/ElementsPreview'
import { builtInItems, LIBRARY_DRAG_TYPE, type LibraryItem } from '@/lib/board/library'

type LibraryPanelProps = {
  userItems: LibraryItem[]
  canAddSelection: boolean
  onAddSelection: () => void
  onInsert: (item: LibraryItem) => void
  onRemove: (item: LibraryItem) => void
  onClose: () => void
}

function ItemCard({ item, onInsert, onRemove }: { item: LibraryItem; onInsert: () => void; onRemove?: () => void }) {
  return (
    <li className="group relative">
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(LIBRARY_DRAG_TYPE, item.id)
          event.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={onInsert}
        title={`Add ${item.name} to the board, or drag it onto the canvas`}
        className="w-full rounded-xl border border-line bg-surface p-2 text-left transition-shadow hover:border-brand-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <ElementsPreview elements={item.elements} className="h-20 rounded-lg bg-[#f6f6fb]" padding={10} />
        <span className="mt-2 block truncate text-xs font-semibold text-ink">{item.name}</span>
        <span className="block truncate text-[10px] text-ink-subtle">{item.category}</span>
        <GripVertical className="absolute top-3 left-3 size-3.5 text-ink-subtle opacity-0 group-hover:opacity-100" aria-hidden="true" />
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${item.name} from your library`}
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-surface text-ink-muted opacity-0 shadow-sm group-hover:opacity-100 hover:text-accent-red focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  )
}

/** Reusable pieces: drag or click to add them; save the selection as your own item. */
export function LibraryPanel({ userItems, canAddSelection, onAddSelection, onInsert, onRemove, onClose }: LibraryPanelProps) {
  const [query, setQuery] = useState('')
  const matches = (item: LibraryItem) => `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())
  const yours = userItems.filter(matches)
  const kits = builtInItems.filter(matches)

  return (
    <aside aria-label="Library" className="pointer-events-auto flex h-full flex-col rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(18,18,42,0.35)]">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <div className="flex flex-1 gap-1 rounded-lg bg-brand-50 p-1">
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-surface py-1.5 text-xs font-semibold text-brand-600 shadow-sm">
            <Library className="size-3.5" />
            Library
          </span>
          <span className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs text-ink-subtle" title="Comments arrive with real-time collaboration">
            <MessageSquare className="size-3.5" />
            Comments
          </span>
        </div>
        <button type="button" aria-label="Close library" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-brand-50 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand-500">
          <Search className="size-3.5 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">Search library</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library components…"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-subtle"
          />
        </label>
        <button
          type="button"
          disabled={!canAddSelection}
          onClick={onAddSelection}
          title={canAddSelection ? 'Save the selected elements as a library item' : 'Select elements on the board first'}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          Add selection to library
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-ink">
          Your items <span className="rounded-full bg-brand-100 px-2 text-[10px] font-semibold text-brand-600">{userItems.length}</span>
        </h3>
        {yours.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2.5">
            {yours.map((item) => (
              <ItemCard key={item.id} item={item} onInsert={() => onInsert(item)} onRemove={() => onRemove(item)} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">
            {query ? 'No matching items.' : 'Select elements on the board and add them here to reuse them.'}
          </p>
        )}

        <h3 className="mt-5 mb-2 text-sm font-bold text-ink">Shapes &amp; kits</h3>
        <ul className={clsx('grid grid-cols-2 gap-2.5', kits.length === 0 && 'hidden')}>
          {kits.map((item) => (
            <ItemCard key={item.id} item={item} onInsert={() => onInsert(item)} />
          ))}
        </ul>
        {kits.length === 0 && <p className="text-xs text-ink-muted">No matching kits.</p>}
      </div>
    </aside>
  )
}
