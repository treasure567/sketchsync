import { LayoutTemplate, Pencil, Users, Waves, Zap } from 'lucide-react'
import { EmptyBoardsIllustration } from '@/components/dashboard/EmptyBoardsIllustration'
import { ButtonLink } from '@/components/ui/Button'

const highlights = [
  { icon: Waves, label: 'Infinite canvas with 60fps pan & zoom' },
  { icon: Users, label: 'Real-time multiplayer with zero lag' },
  { icon: Zap, label: 'Works offline, merges automatically' },
]

export function EmptyBoards() {
  return (
    <section
      aria-labelledby="empty-boards-heading"
      className="relative overflow-hidden rounded-3xl border border-line bg-surface px-5 py-10 text-center shadow-[0_24px_60px_-30px_rgba(18,18,42,0.25)] sm:px-10 sm:py-14"
    >
      <span aria-hidden="true" className="absolute -top-24 -left-24 size-72 rounded-full bg-radial from-brand-100 to-transparent to-70%" />
      <span aria-hidden="true" className="absolute -right-24 -bottom-24 size-72 rounded-full bg-radial from-accent-teal-soft to-transparent to-70%" />

      <div className="relative">
        <EmptyBoardsIllustration />

        <h2 id="empty-boards-heading" className="mt-6 text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-3xl">
          No boards yet. <span className="whitespace-nowrap text-brand-500">Start sketching.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
          Create your first collaborative canvas to brainstorm ideas, diagram system architectures, or sketch low-fi wireframes in real-time.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/board" size="lg">
            <Pencil className="size-4" />
            Create new board
          </ButtonLink>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-50 px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <LayoutTemplate className="size-4" />
            Browse templates library
          </button>
        </div>

        <ul className="mx-auto mt-10 flex max-w-xl flex-wrap justify-center gap-2.5 border-t border-line pt-7">
          {highlights.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs text-ink-muted">
              <Icon className="size-3.5 text-brand-500" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
