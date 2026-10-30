import { Map as MapIcon } from 'lucide-react'
import { ZoomControls } from '@/components/landing/board-preview/ZoomControls'
import { TextFormatToolbar } from '@/components/landing/collaboration/TextFormatToolbar'
import { SprintCard } from '@/components/landing/collaboration/SprintCard'
import { ScaledStage } from '@/components/landing/ScaledStage'

const WIDE_STAGE = { width: 1360, height: 550 }
const COMPACT_STAGE = { width: 480, height: 640 }

const CARD = { width: 214, height: 208 }

const sprints = {
  july: {
    sprint: 'SPRINT 12 • JUL',
    title: 'Canvas Infinite Zoom',
    description: 'Smooth 60fps pan/zoom engine with WebGL renderer.',
    status: 'shipped',
  },
  august: {
    sprint: 'SPRINT 13 • AUG',
    title: 'Multiplayer Audio',
    description: 'Drop-in spatial voice rooms directly on the canvas.',
    status: 'review',
    hasComments: true,
  },
  september: {
    sprint: 'SPRINT 14 • SEP',
    title: 'AI Diagram Gen',
    description: 'Prompt-to-flowchart translation with instant layout.',
    status: 'planned',
  },
} as const

function WideStage() {
  return (
    <>
      <TextFormatToolbar className="absolute top-10 left-7" />

      <SprintCard {...sprints.july} className="-rotate-2" style={{ left: 310, top: 170, ...CARD }} />
      <SprintCard {...sprints.august} style={{ left: 572, top: 168, ...CARD }} />
      <SprintCard {...sprints.september} style={{ left: 832, top: 174, ...CARD }} />

      <ZoomControls zoom={125} icon={MapIcon} className="absolute right-7 bottom-6" />
    </>
  )
}

function CompactStage() {
  return (
    <>
      <TextFormatToolbar className="absolute top-6 left-1/2 -translate-x-1/2" />

      <SprintCard {...sprints.july} className="-rotate-2" style={{ left: 20, top: 110, ...CARD }} />
      <SprintCard {...sprints.august} style={{ left: 248, top: 110, ...CARD }} />
      <SprintCard {...sprints.september} style={{ left: 133, top: 352, ...CARD }} />

      <ZoomControls zoom={125} icon={MapIcon} className="absolute right-5 bottom-5" />
    </>
  )
}

export function CollaborationPreview() {
  return (
    <ScaledStage
      wide={WIDE_STAGE}
      compact={COMPACT_STAGE}
      label="A shared roadmap board with three sprint cards: Canvas Infinite Zoom shipped, Multiplayer Audio in review with comments, and AI Diagram Gen planned."
      className="rounded-3xl border border-line bg-[#f8f8fc] shadow-[0_20px_50px_-30px_rgba(18,18,42,0.2)]"
    >
      {(layout) => (layout === 'compact' ? <CompactStage /> : <WideStage />)}
    </ScaledStage>
  )
}
