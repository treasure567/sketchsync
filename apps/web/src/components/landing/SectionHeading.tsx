import clsx from 'clsx'
import { HandUnderline } from '@/components/landing/Doodles'

export type AccentTone = 'brand' | 'teal' | 'orange'

const accentTones: Record<AccentTone, { text: string; underline: string; weight: number }> = {
  brand: { text: 'text-brand-500', underline: 'text-brand-200', weight: 3 },
  teal: { text: 'text-accent-teal', underline: 'text-accent-teal-line', weight: 3 },
  orange: { text: 'text-accent-amber', underline: 'text-accent-amber-soft', weight: 7 },
}

type SectionHeadingProps = {
  id: string
  lead: string
  accent: string
  /** Text after the accent. */
  tail?: string
  /** Where the heading breaks onto a second line from the sm breakpoint. */
  lineBreak?: 'beforeAccent' | 'beforeTail' | 'none'
  description: string
  tone?: AccentTone
}

/** Line break that only applies from the sm breakpoint, so phones wrap naturally. */
function SmBreak() {
  return (
    <>
      {' '}
      <br className="hidden sm:block" />
    </>
  )
}

/** Centred section title with a hand-underlined accent phrase. */
export function SectionHeading({ id, lead, accent, tail, lineBreak = 'beforeTail', description, tone = 'brand' }: SectionHeadingProps) {
  const accentTone = accentTones[tone]

  return (
    <div className="mx-auto max-w-4xl text-center">
      <h2 id={id} className="text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
        {lead}
        {lineBreak === 'beforeAccent' ? <SmBreak /> : ' '}
        <span className={clsx('relative inline-block font-bold', accentTone.text)}>
          <HandUnderline
            weight={accentTone.weight}
            className={clsx('absolute inset-x-0 -bottom-1.5 h-2.5 w-full', accentTone.underline)}
          />
          <span className="relative">{accent}</span>
        </span>
        {tail && lineBreak === 'beforeTail' && <SmBreak />}
        {tail}
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-sm text-ink-muted sm:text-base">{description}</p>
    </div>
  )
}
