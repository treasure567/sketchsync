import { Pointer, RefreshCw, Shapes } from 'lucide-react'

const features = [
  {
    icon: Pointer,
    title: 'Easy to use',
    description: 'Intuitive gestures and zero learning curve so anyone can jump in instantly.',
  },
  {
    icon: Shapes,
    title: 'Libraries',
    description: 'Reusable stencils, wireframe components, and custom UI icon kits.',
  },
  {
    icon: RefreshCw,
    title: 'Real-time sync',
    description: 'Millisecond latency canvas sync across unlimited remote collaborators.',
  },
]

export function FeatureCards() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {features.map(({ icon: Icon, title, description }) => (
        <li key={title} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-brand-100 text-brand-600">
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>
        </li>
      ))}
    </ul>
  )
}
