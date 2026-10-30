import { Eye, Link, MessagesSquare } from 'lucide-react'
import { CollaborationPreview } from '@/components/landing/CollaborationPreview'
import { FeatureCards, type Feature } from '@/components/landing/FeatureCards'
import { SectionHeading } from '@/components/landing/SectionHeading'

const features: Feature[] = [
  {
    icon: Link,
    title: 'Shareable link',
    description: 'Collaborate in real time with permissions for team editing.',
  },
  {
    icon: Eye,
    title: 'Read-only link',
    description: 'Share just content, not the access, perfect for clients & presentations.',
  },
  {
    icon: MessagesSquare,
    title: 'Contextual feedback',
    description: 'Drop pins and pin threaded comments directly on specific board nodes.',
  },
]

export function Collaboration() {
  return (
    <section id="collaboration" aria-labelledby="collaboration-heading" className="bg-[#fbfbfe] pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="collaboration-heading"
          lead="Send a link, get feedback and"
          accent="finish the idea"
          tail="together."
          description="Bring your team or classmates into a live canvas with instant presence and targeted comments."
          tone="teal"
        />

        <div className="mt-12 sm:mt-14">
          <CollaborationPreview />
        </div>

        <div className="mt-8 sm:mt-10">
          <FeatureCards features={features} tone="teal" />
        </div>
      </div>
    </section>
  )
}
