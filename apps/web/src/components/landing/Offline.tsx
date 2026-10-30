import { OfflinePreview } from '@/components/landing/OfflinePreview'
import { SectionHeading } from '@/components/landing/SectionHeading'

export function Offline() {
  return (
    <section id="offline" aria-labelledby="offline-heading" className="bg-[#fbfbfe] pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="offline-heading"
          lead="Works offline,"
          accent="merges when you're back"
          tail="."
          breakBeforeTail={false}
          description="Keep drawing on a poor connection. Your edits merge automatically without conflict."
          tone="orange"
        />

        <div className="mt-12 sm:mt-14">
          <OfflinePreview />
        </div>
      </div>
    </section>
  )
}
