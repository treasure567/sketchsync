import { ArrowRight, BookOpen, Plus, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { TemplateId } from '@/lib/boards/templates'
import { MiniNote } from '@/components/dashboard/MiniNote'

type Template = {
  id: TemplateId
  name: string
  description: string
  preview: ReactNode
}

const templates: Template[] = [
  {
    id: 'blank',
    name: 'Blank Board',
    description: 'Infinite canvas workspace',
    preview: (
      <>
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-1/2 place-items-center rounded-full bg-surface text-brand-600 shadow-sm">
          <Plus className="size-5" />
        </span>
        <span className="absolute right-3 bottom-2 font-hand text-sm text-ink-muted">freeform canvas</span>
      </>
    ),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Sticky notes & voting dots',
    preview: (
      <>
        <MiniNote tone="yellow" className="top-[14%] left-[8%] w-[28%] -rotate-3">
          Dark mode?
        </MiniNote>
        <MiniNote tone="pink" className="top-[22%] left-[38%] w-[30%] rotate-2">
          Real-time presence
        </MiniNote>
        <MiniNote tone="mint" className="right-[6%] bottom-[16%] w-[28%] -rotate-2">
          Next steps ✓
        </MiniNote>
      </>
    ),
  },
  {
    id: 'lecture',
    name: 'Lecture Notes',
    description: 'Cornell notes & formula blocks',
    preview: (
      <span className="absolute inset-0 flex flex-col justify-center gap-2 px-[10%]">
        <span className="h-1 w-3/4 rounded-full bg-line" />
        <span className="flex items-center justify-between gap-2">
          <span className="rounded bg-sticky px-1.5 py-0.5 font-hand text-xs text-sticky-ink">Theorem 4.1: f(x) ≥ g(x)</span>
          <span className="grid size-5 place-items-center rounded bg-brand-100 text-brand-600">
            <BookOpen className="size-3" />
          </span>
        </span>
        <span className="h-1 w-1/2 rounded-full bg-line" />
      </span>
    ),
  },
  {
    id: 'flowchart',
    name: 'Flowchart & System',
    description: 'Connected orthogonal nodes',
    preview: (
      <>
        <Workflow className="absolute top-2.5 right-3 size-3.5 text-brand-500" />
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <span className="rounded border border-line bg-surface px-2 py-1 font-mono text-[9px] text-ink">CLIENT</span>
          <span className="w-10 border-t border-dashed border-brand-500" />
          <span className="rounded border border-brand-200 bg-surface px-2 py-1 font-mono text-[9px] text-brand-600">GATEWAY</span>
        </span>
      </>
    ),
  },
]

export function TemplateGallery({ onBrowseAll }: { onBrowseAll: () => void }) {
  return (
    <section aria-labelledby="template-gallery-heading">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="template-gallery-heading" className="flex items-center gap-2 text-base font-bold text-ink">
          <span className="size-2 rounded-full bg-brand-500" aria-hidden="true" />
          Start from a template
        </h2>
        <button type="button" onClick={onBrowseAll} className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          Browse all templates
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {templates.map(({ id, name, description, preview }) => (
          <li key={name}>
            <Link
              to={`/board/new?template=${id}`}
              className="block w-full overflow-hidden rounded-xl border border-line bg-surface p-2 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <span className="relative block h-24 overflow-hidden rounded-lg bg-[#f4f4fa] sm:h-28" aria-hidden="true">
                {preview}
              </span>
              <span className="block px-1.5 pt-2.5 pb-1">
                <span className="block truncate text-sm font-bold text-ink">{name}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-muted">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
