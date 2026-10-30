import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import type { AccentTone } from '@/components/landing/SectionHeading'

export type Feature = {
  icon: LucideIcon
  title: string
  description: string
}

const iconTones: Record<AccentTone, string> = {
  brand: 'bg-brand-100 text-brand-600',
  teal: 'bg-accent-teal-soft text-accent-teal',
  orange: 'bg-accent-amber-soft text-accent-amber',
}

type FeatureCardsProps = {
  features: Feature[]
  tone?: AccentTone
}

export function FeatureCards({ features, tone = 'brand' }: FeatureCardsProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {features.map(({ icon: Icon, title, description }) => (
        <li key={title} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
          <span className={clsx('grid size-10 place-items-center rounded-lg', iconTones[tone])}>
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>
        </li>
      ))}
    </ul>
  )
}
