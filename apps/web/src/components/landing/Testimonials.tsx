import clsx from 'clsx'
import { Quote, Star } from 'lucide-react'
import { SectionHeading } from '@/components/landing/SectionHeading'

type Testimonial = {
  quote: string
  name: string
  handle: string
  initials: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'SketchSync is the first tool where drawing complex distributed systems during live university lectures doesn’t feel like a chore. Zero latency and no account wall for my students.',
    name: 'Dr. Sarah Chen',
    handle: '@sarahcodes',
    initials: 'SC',
    avatar: 'bg-brand-500',
  },
  {
    quote:
      'We replaced bulky enterprise whiteboard suites for all our design sprints. With the keyboard shortcuts and hand-drawn vibe, our product team aligns 3x faster.',
    name: 'Marcus Vance',
    handle: '@marcusdesign',
    initials: 'MV',
    avatar: 'bg-linear-to-br from-accent-orange to-accent-red',
  },
  {
    quote:
      'Offline mode saved me on two 9-hour transatlantic flights. Sketched full microservice architectures without Wi-Fi, and it cleanly merged the second I landed at JFK.',
    name: 'Amara Okafor',
    handle: '@amara_arch',
    initials: 'AO',
    avatar: 'bg-accent-green',
  },
]

function TestimonialCard({ quote, name, handle, initials, avatar }: Testimonial) {
  return (
    <figure className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 text-accent-orange" role="img" aria-label="Rated 5 out of 5">
          {Array.from({ length: 5 }, (_, index) => (
            <Star key={index} className="size-3.5 fill-current" aria-hidden="true" />
          ))}
        </div>
        <span className="grid size-5 place-items-center rounded bg-brand-100 text-brand-500" aria-hidden="true">
          <Quote className="size-3 fill-current" />
        </span>
      </div>

      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">“{quote}”</blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-5">
        <span className={clsx('grid size-9 place-items-center rounded-full text-xs font-bold text-white', avatar)} aria-hidden="true">
          {initials}
        </span>
        <span>
          <span className="block text-sm font-bold text-ink">{name}</span>
          <span className="block text-xs text-ink-subtle">{handle}</span>
        </span>
      </figcaption>
    </figure>
  )
}

export function Testimonials() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="bg-[#fbfbfe] pb-16 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="testimonials-heading"
          lead="Loved by thinkers, teachers &"
          accent="tinkerers"
          lineBreak="none"
          description="Thousands of developers, professors, and designers start their ideas on SketchSync every single day."
          tone="teal"
        />

        <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3 lg:gap-5">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.name} {...testimonial} />
          ))}
        </div>
      </div>
    </section>
  )
}
