import clsx from 'clsx'
import { BadgeCheck, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'

type Slide = {
  headline: string
  body: string
  name: string
  handle: string
  initials: string
  avatar: string
}

const slides: Slide[] = [
  {
    headline: 'We use SketchSync for every single study session.',
    body: 'Diagramming distributed systems and sketching UI flows in real time during seminars used to be pure chaos. With SketchSync, our cohort aligns on architecture in seconds.',
    name: 'Odewande Shindara',
    handle: '@ode_shindara',
    initials: 'OS',
    avatar: 'bg-accent-teal',
  },
  {
    headline: 'Zero latency and no account wall for my students.',
    body: 'SketchSync is the first tool where drawing complex distributed systems during live university lectures doesn’t feel like a chore.',
    name: 'Dr. Sarah Chen',
    handle: '@sarahcodes',
    initials: 'SC',
    avatar: 'bg-brand-500',
  },
  {
    headline: 'It cleanly merged the second I landed.',
    body: 'Offline mode saved me on two 9-hour transatlantic flights. I sketched full microservice architectures without Wi-Fi.',
    name: 'Amara Okafor',
    handle: '@amara_arch',
    initials: 'AO',
    avatar: 'bg-accent-green',
  },
]

/** Dashed sun doodle peeking from behind the card's corner. */
function SunDoodle() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="absolute -right-6 -bottom-8 w-20 text-[#c9d3cf]">
      <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M32 4v6M32 54v6M4 32h6M54 32h6M12 12l4 4M48 48l4 4M52 12l-4 4M12 52l4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

const controlButton =
  'grid size-8 place-items-center rounded-full bg-brand-100 text-ink transition-colors hover:bg-brand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0)
  const slide = slides[current]

  const go = (offset: number) => setCurrent((index) => (index + offset + slides.length) % slides.length)

  return (
    <section aria-roledescription="carousel" aria-label="What students and teams say" className="w-full">
      <div className="relative">
        <SunDoodle />
        <figure
          aria-roledescription="slide"
          aria-label={`${current + 1} of ${slides.length}`}
          aria-live="polite"
          className="relative min-h-[280px] -rotate-2 rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(18,18,42,0.35)]"
        >
          <div className="flex gap-0.5 text-accent-orange" role="img" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className="size-4 fill-current" aria-hidden="true" />
            ))}
          </div>

          <blockquote className="mt-4">
            <p className="text-2xl leading-snug font-bold tracking-tight text-ink">“{slide.headline}”</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{slide.body}</p>
          </blockquote>

          <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-5">
            <span className={clsx('grid size-11 place-items-center rounded-full text-sm font-bold text-white', slide.avatar)} aria-hidden="true">
              {slide.initials}
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                {slide.name}
                <BadgeCheck className="size-4 fill-accent-green text-white" aria-label="Verified" />
              </span>
              <span className="block text-xs text-ink-subtle">{slide.handle}</span>
            </span>
          </figcaption>
        </figure>
      </div>

      <div className="mt-8 flex items-center justify-between px-6">
        <div className="flex items-center gap-1.5">
          {slides.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-label={`Show testimonial ${index + 1}`}
              aria-current={index === current}
              onClick={() => setCurrent(index)}
              className={clsx(
                'h-2 rounded-full transition-all',
                index === current ? 'w-6 bg-brand-600' : 'w-2 bg-ink-subtle/40 hover:bg-ink-subtle',
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous testimonial" onClick={() => go(-1)} className={controlButton}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next testimonial" onClick={() => go(1)} className={controlButton}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
