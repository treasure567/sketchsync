import clsx from 'clsx'
import { HandUnderline } from '@/components/landing/Doodles'

export type AccentTone = 'brand' | 'teal'

const accentTones: Record<AccentTone, { text: string; underline: string }> = {
  brand: { text: 'text-brand-500', underline: 'text-brand-200' },
  teal: { text: 'text-accent-teal', underline: 'text-accent-teal-line' },
}

type SectionHeadingProps = {
  id: string
  lead: string
  accent: string
  /** Text after the accent; it starts on a new line from the sm breakpoint. */
  tail: string
  description: string
  tone?: AccentTone
}

/** Centred section title with a hand-underlined accent phrase. */
export function SectionHeading({ id, lead, accent, tail, description, tone = 'brand' }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2 id={id} className="text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        {lead}{' '}
        <span className={clsx('relative inline-block font-bold', accentTones[tone].text)}>
          {accent}
          <HandUnderline className={clsx('absolute inset-x-0 -bottom-1.5 h-2.5 w-full', accentTones[tone].underline)} />
        </span>{' '}
        <br className="hidden sm:block" />
        {tail}
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-sm text-ink-muted sm:text-base">{description}</p>
    </div>
  )
}
