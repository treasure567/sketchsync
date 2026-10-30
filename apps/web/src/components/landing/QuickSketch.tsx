import { QuickSketchPreview } from '@/components/landing/QuickSketchPreview'
import { SectionHeading } from '@/components/landing/SectionHeading'

export function QuickSketch() {
  return (
    <section id="quick-sketch" aria-labelledby="quick-sketch-heading" className="bg-[#fbfbfe] pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="quick-sketch-heading"
          lead="The easiest way to get your thoughts"
          accent="on screen"
          lineBreak="beforeAccent"
          description="Quick drawings and mockups with a unique aesthetic. Intuitive shortcuts and a command palette."
        />

        <div className="mt-12 sm:mt-14">
          <QuickSketchPreview />
        </div>
      </div>
    </section>
  )
}
