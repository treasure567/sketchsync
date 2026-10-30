import { HandUnderline } from '@/components/landing/Doodles'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { ShowcasePreview } from '@/components/landing/ShowcasePreview'

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="border-t border-line bg-[#fbfbfe] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 id="features-heading" className="text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
            Simply designed to create{' '}
            <span className="relative inline-block font-bold text-brand-500">
              perfect results
              <HandUnderline className="absolute inset-x-0 -bottom-1.5 h-2.5 w-full text-brand-200" />
            </span>{' '}
            <br className="hidden sm:block" />
            fast.
          </h2>
          <p className="mt-5 text-sm text-ink-muted sm:text-base">Elementary tools, advanced features and an infinite canvas.</p>
        </div>

        <div className="mt-12 sm:mt-14">
          <ShowcasePreview />
        </div>

        <div className="mt-8 sm:mt-10">
          <FeatureCards />
        </div>
      </div>
    </section>
  )
}
