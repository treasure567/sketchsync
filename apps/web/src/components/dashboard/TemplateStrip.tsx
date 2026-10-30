import clsx from 'clsx'
import { ArrowRight, Presentation, SquarePlus, StickyNote, Workflow, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { TemplateId } from '@/lib/boards/templates'

type Template = {
  id: TemplateId
  name: string
  description: string
  icon: LucideIcon
  iconTile: string
  /** Decoration in the card's top-right corner. */
  accent: ReactNode
  /** Soft glow behind the accent. */
  glow?: string
}

const templates: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Freeform space with infinite pan & zoom',
    icon: SquarePlus,
    iconTile: 'bg-brand-100 text-brand-600',
    accent: <span className="-rotate-6 font-hand text-lg text-ink-muted">pure freedom</span>,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Affinity mapping, voting & sticky notes',
    icon: StickyNote,
    iconTile: 'bg-sticky text-[#b4610e]',
    accent: (
      <span className="flex gap-1">
        <span className="size-3 rotate-12 rounded-sm bg-[#fbd38d]" />
        <span className="size-3 -rotate-6 rounded-sm bg-[#fbb6ce]" />
        <span className="size-3 rotate-3 rounded-sm bg-[#9ae6b4]" />
      </span>
    ),
    glow: 'from-[#fde68a]/60',
  },
  {
    id: 'lecture',
    name: 'Lecture notes',
    description: 'Split Cornell layout with sketch areas',
    icon: Presentation,
    iconTile: 'bg-accent-teal-soft text-accent-teal',
    accent: null,
    glow: 'from-accent-teal-line/50',
  },
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Connected shapes for systems and flows',
    icon: Workflow,
    iconTile: 'bg-brand-100 text-brand-600',
    accent: <span className="font-hand text-xl font-semibold text-accent-teal">A → B</span>,
    glow: 'from-accent-teal-soft',
  },
]

export function TemplateStrip({ onBrowseAll }: { onBrowseAll: () => void }) {
  return (
    <section aria-labelledby="templates-heading">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="templates-heading" className="text-xs font-bold tracking-wider text-ink uppercase">
          Kickstart with a template
        </h2>
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-brand-600">4 presets</span>
        <button type="button" onClick={onBrowseAll} className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          Browse all templates
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {templates.map(({ id, name, description, icon: Icon, iconTile, accent, glow }) => (
          <li key={name}>
            <Link
              to={`/board/new?template=${id}`}
              className="relative block w-full overflow-hidden rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {glow && <span aria-hidden="true" className={clsx('absolute -top-10 -right-10 size-32 rounded-full bg-radial to-transparent to-70%', glow)} />}
              <span className="relative flex items-start justify-between">
                <span className={clsx('grid size-9 place-items-center rounded-lg', iconTile)}>
                  <Icon className="size-[18px]" />
                </span>
                <span aria-hidden="true">{accent}</span>
              </span>
              <span className="relative mt-4 block text-sm font-bold text-ink">{name}</span>
              <span className="relative mt-1 block truncate text-xs text-ink-muted">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
