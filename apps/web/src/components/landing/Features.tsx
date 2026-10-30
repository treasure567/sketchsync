import { Pointer, RefreshCw, Shapes } from 'lucide-react'
import { FeatureCards, type Feature } from '@/components/landing/FeatureCards'
import { SectionHeading } from '@/components/landing/SectionHeading'
import { ShowcasePreview } from '@/components/landing/ShowcasePreview'

const features: Feature[] = [
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

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="border-t border-line bg-[#fbfbfe] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="features-heading"
          lead="Simply designed to create"
          accent="perfect results"
          tail="fast."
          description="Elementary tools, advanced features and an infinite canvas."
        />

        <div className="mt-12 sm:mt-14">
          <ShowcasePreview />
        </div>

        <div className="mt-8 sm:mt-10">
          <FeatureCards features={features} />
        </div>
      </div>
    </section>
  )
}
