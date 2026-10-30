import { Download, History, WifiOff } from 'lucide-react'
import { FeatureCards, type Feature } from '@/components/landing/FeatureCards'
import { OfflinePreview } from '@/components/landing/OfflinePreview'
import { SectionHeading } from '@/components/landing/SectionHeading'

const features: Feature[] = [
  {
    icon: WifiOff,
    title: 'Offline editing',
    description: 'Full local-first capabilities with instant zero-lag drawing without Wi-Fi.',
  },
  {
    icon: History,
    title: 'Version history',
    description: 'Granular time-travel scrubbing to restore any snapshot or branch.',
  },
  {
    icon: Download,
    title: 'Export PNG/SVG/PDF',
    description: 'Export vectors at 1×, 2×, 3× or raw SVG with transparent backgrounds anytime.',
  },
]

export function Offline() {
  return (
    <section id="offline" aria-labelledby="offline-heading" className="bg-[#fbfbfe] pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="offline-heading"
          lead="Works offline,"
          accent="merges when you're back"
          tail="."
          lineBreak="none"
          description="Keep drawing on a poor connection. Your edits merge automatically without conflict."
          tone="orange"
        />

        <div className="mt-12 sm:mt-14">
          <OfflinePreview />
        </div>

        <div className="mt-8 sm:mt-10">
          <FeatureCards features={features} tone="orange" />
        </div>
      </div>
    </section>
  )
}
