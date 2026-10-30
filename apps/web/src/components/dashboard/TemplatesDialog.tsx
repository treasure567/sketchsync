import { LayoutTemplate } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { ElementsPreview } from '@/components/board/ElementsPreview'
import { Dialog } from '@/components/ui/Dialog'
import { templates } from '@/lib/boards/templates'

const descriptions: Record<string, string> = {
  blank: 'Infinite canvas with nothing on it yet',
  brainstorm: 'Sticky notes in three colours, ready for voting',
  lecture: 'Cornell layout: cues, notes and a summary',
  flowchart: 'Client, gateway, decision and service, already connected',
}

/** Every template with a live preview; choosing one creates a board from it. */
export function TemplatesDialog({ onClose }: { onClose: () => void }) {
  const previews = useMemo(() => templates.map((template) => ({ ...template, elements: template.build() })), [])

  return (
    <Dialog title="Templates library" description="Start a board with ready-made content" icon={<LayoutTemplate className="size-5" />} onClose={onClose} className="max-w-3xl">
      <ul className="grid gap-4 sm:grid-cols-2">
        {previews.map(({ id, name, elements }) => (
          <li key={id}>
            <Link
              to={`/board/new?template=${id}`}
              className="block rounded-xl border border-line p-2 transition-shadow hover:border-brand-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              {elements.length > 0 ? (
                <ElementsPreview elements={elements} className="h-36 rounded-lg bg-[#f6f6fb]" padding={16} />
              ) : (
                <div className="grid h-36 place-items-center rounded-lg bg-[#f6f6fb] font-hand text-lg text-ink-subtle">freeform canvas</div>
              )}
              <span className="block px-1 pt-2.5 text-sm font-bold text-ink">{id === 'blank' ? 'Blank Board' : name}</span>
              <span className="block px-1 pb-1 text-xs text-ink-muted">{descriptions[id]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
