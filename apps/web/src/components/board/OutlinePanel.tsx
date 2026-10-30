import clsx from 'clsx'
import { Crosshair, ListTree, Trash2, X } from 'lucide-react'
import { describeElement } from '@/lib/board/actions'
import type { BoardElement } from '@/lib/board/types'

type OutlinePanelProps = {
  elements: BoardElement[]
  selectedIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onFocus: (element: BoardElement) => void
  onDelete: (id: string) => void
  onClose: () => void
}

/**
 * The board as a text list, top layer first: an accessible alternative to the
 * canvas for screen-reader and keyboard users. Each entry can be selected
 * (then styled with the panel or nudged with arrow keys), shown or deleted.
 */
export function OutlinePanel({ elements, selectedIds, onSelect, onFocus, onDelete, onClose }: OutlinePanelProps) {
  const ordered = [...elements].reverse()

  return (
    <section aria-labelledby="outline-heading" className="pointer-events-auto flex h-full flex-col rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(18,18,42,0.35)]">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <ListTree className="size-4 text-brand-500" aria-hidden="true" />
        <h2 id="outline-heading" className="flex-1 text-sm font-bold text-ink">
          Board outline
        </h2>
        <span className="text-[11px] text-ink-muted" aria-live="polite">
          {elements.length} {elements.length === 1 ? 'element' : 'elements'}, {selectedIds.size} selected
        </span>
        <button type="button" aria-label="Close outline" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-brand-50 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <p className="border-b border-line px-3 py-2 text-[11px] text-ink-muted">Top layer first. Select an item, then use arrow keys to nudge it or Delete to remove it.</p>

      {ordered.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">The board is empty. Pick a tool from the toolbar to add something.</p>
      ) : (
        <ul className="flex-1 overflow-y-auto p-2">
          {ordered.map((element) => {
            const selected = selectedIds.has(element.id)
            const description = describeElement(element)
            return (
              <li key={element.id} className={clsx('flex items-center gap-1 rounded-lg', selected && 'bg-brand-50')}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(element.id)}
                  className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left text-xs text-ink hover:bg-brand-50"
                  title={description}
                >
                  {description}
                  {element.locked && <span className="text-ink-muted"> · locked</span>}
                </button>
                <button type="button" aria-label={`Show ${description}`} onClick={() => onFocus(element)} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-brand-50 hover:text-ink">
                  <Crosshair className="size-3.5" />
                </button>
                <button type="button" aria-label={`Delete ${description}`} onClick={() => onDelete(element.id)} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-[#fde8ea] hover:text-accent-red">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
