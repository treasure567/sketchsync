import { CirclePlay, Sparkles } from 'lucide-react'
import { LogoMark } from '@/components/brand/LogoMark'
import { StarOutline, Wave } from '@/components/landing/Doodles'
import { ButtonLink } from '@/components/ui/Button'

export function CallToAction() {
  return (
    <section aria-labelledby="cta-heading" className="bg-[#fbfbfe] pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-brand-200 bg-linear-to-br from-brand-50 via-[#fbfaff] to-[#fdf6e9] px-5 py-16 text-center shadow-[0_20px_50px_-30px_rgba(18,18,42,0.25)] sm:px-10 sm:py-20">
          {/* Decorations */}
          <div aria-hidden="true">
            <StarOutline className="absolute top-6 left-6 size-7 -rotate-12 text-accent-orange sm:top-8 sm:left-8" />
            <Sparkles className="absolute top-6 right-6 size-6 text-accent-teal sm:top-10 sm:right-10" strokeWidth={1.6} />
            <StarOutline className="absolute right-8 bottom-6 size-8 rotate-12 text-[#f07a9a] sm:right-14 sm:bottom-8" />
            <Wave className="absolute bottom-8 left-8 w-10 text-brand-200 max-sm:hidden" />
          </div>

          <p className="-rotate-3 font-hand text-2xl font-bold text-brand-500 sm:text-3xl">Say hi to SketchSync</p>
          <h2 id="cta-heading" className="mx-auto mt-2 max-w-2xl text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink sm:text-[2.6rem]">
            Start sketching your big idea in seconds.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm text-ink-muted sm:text-base">
            Free and no account needed. Just open your canvas and let your creativity flow.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <span aria-hidden="true" className="-rotate-6 font-hand text-lg font-semibold text-brand-700 max-md:hidden">
              No credit card! →
            </span>
            <ButtonLink to="/board" size="lg" className="w-full sm:w-auto sm:min-w-44">
              <LogoMark className="size-5" />
              Start drawing
            </ButtonLink>
            <ButtonLink to="/demo" variant="secondary" size="lg" className="w-full sm:w-auto sm:min-w-40">
              <CirclePlay className="size-5" />
              Try a demo
            </ButtonLink>
            <span aria-hidden="true" className="rotate-6 font-hand text-lg font-semibold text-accent-teal max-md:hidden">
              ← Instant canvas
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
