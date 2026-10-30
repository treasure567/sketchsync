import { DraftCard } from '@/components/landing/offline/DraftCard'
import { LocalStateCard } from '@/components/landing/offline/LocalStateCard'
import { ScaledStage } from '@/components/landing/ScaledStage'

const WIDE_STAGE = { width: 1360, height: 550 }
const COMPACT_STAGE = { width: 480, height: 460 }

function WideStage() {
  return (
    <>
      <LocalStateCard className="absolute top-[38px] left-[26px] w-[244px]" />
      <DraftCard className="absolute top-[150px] left-[532px] h-[250px] w-[296px]" />
    </>
  )
}

function CompactStage() {
  return (
    <>
      <LocalStateCard className="absolute top-5 left-5 w-[244px]" />
      <DraftCard className="absolute top-[178px] left-[92px] h-[250px] w-[296px]" />
    </>
  )
}

export function OfflinePreview() {
  return (
    <ScaledStage
      wide={WIDE_STAGE}
      compact={COMPACT_STAGE}
      label="A board edited offline: a status card shows 12 buffered strokes cached locally with automatic CRDT conflict resolution, next to a draft frame marked pending sync."
      className="rounded-3xl border border-line bg-[#f8f8fc] shadow-[0_20px_50px_-30px_rgba(18,18,42,0.2)]"
    >
      {(layout) => (layout === 'compact' ? <CompactStage /> : <WideStage />)}
    </ScaledStage>
  )
}
