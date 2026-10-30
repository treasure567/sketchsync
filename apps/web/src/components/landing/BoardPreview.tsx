import { ScaledStage } from '@/components/landing/ScaledStage'
import { ElementStylePanel } from '@/components/landing/board-preview/ElementStylePanel'
import { LiveCursor } from '@/components/landing/board-preview/LiveCursor'
import { PreviewToolbar } from '@/components/landing/board-preview/PreviewToolbar'
import { StickyNote } from '@/components/landing/board-preview/StickyNote'
import { ThreadPanel } from '@/components/landing/board-preview/ThreadPanel'
import { WorkflowNodeCard } from '@/components/landing/board-preview/WorkflowNodeCard'
import { ZoomControls } from '@/components/landing/board-preview/ZoomControls'

const WIDE_STAGE = { width: 1360, height: 680 }
const COMPACT_STAGE = { width: 480, height: 560 }

const CARD = { width: 284, height: 236 }

const presence = {
  liam: '#f0475e',
  aris: '#3b6ff5',
  elena: '#1f6f5a',
}

function TypingDots() {
  return (
    <span className="ml-0.5 inline-flex gap-0.5">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="size-1 rounded-full bg-white" />
      ))}
    </span>
  )
}

function WideStage() {
  return (
    <>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${WIDE_STAGE.width} ${WIDE_STAGE.height}`} fill="none">
        <path d="M494 252 C 530 262, 520 300, 548 312" stroke="#5b4cf5" strokeWidth={1.8} strokeDasharray="5 5" />
        <path d="M846 318 C 900 352, 930 352, 958 300 S 990 262, 1000 258" stroke="#1f6f5a" strokeWidth={2} />
      </svg>

      <PreviewToolbar className="absolute top-6 left-1/2 -translate-x-1/2" />
      <ElementStylePanel className="absolute top-[90px] left-[22px] w-56" />
      <StickyNote className="absolute top-[124px] left-[300px] h-[166px] w-[196px] -rotate-2" />
      <WorkflowNodeCard {...CARD} style={{ left: 562, top: 166 }} />
      <ThreadPanel className="absolute top-[74px] left-[1000px] w-[340px]" />
      <ZoomControls className="absolute bottom-6 left-[22px]" />

      <LiveCursor label="Liam" color={presence.liam} labelSide="left" style={{ left: 488, top: 300 }} />
      <LiveCursor label="Dr. Aris" color={presence.aris} style={{ left: 866, top: 138 }} />
      <LiveCursor
        label={
          <>
            Elena typing... <TypingDots />
          </>
        }
        color={presence.elena}
        style={{ left: 760, top: 416 }}
      />
    </>
  )
}

function CompactStage() {
  return (
    <>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${COMPACT_STAGE.width} ${COMPACT_STAGE.height}`} fill="none">
        <path d="M160 248 C 175 262, 172 290, 188 300" stroke="#5b4cf5" strokeWidth={1.8} strokeDasharray="5 5" />
      </svg>

      <PreviewToolbar className="absolute top-5 left-1/2 -translate-x-1/2" />
      <StickyNote className="absolute top-[92px] left-[18px] h-[156px] w-[176px] -rotate-3" />
      <WorkflowNodeCard {...CARD} style={{ left: 180, top: 220 }} />
      <ZoomControls className="absolute bottom-[18px] left-[18px]" />

      <LiveCursor label="Liam" color={presence.liam} labelSide="left" style={{ left: 120, top: 316 }} />
      <LiveCursor label="Dr. Aris" color={presence.aris} style={{ left: 380, top: 166 }} />
      <LiveCursor
        label={
          <>
            Elena typing... <TypingDots />
          </>
        }
        color={presence.elena}
        style={{ left: 300, top: 486 }}
      />
    </>
  )
}

export function BoardPreview() {
  return (
    <ScaledStage
      wide={WIDE_STAGE}
      compact={COMPACT_STAGE}
      label="Preview of a SketchSync board: three collaborators editing a workflow card, a sticky note and a comment thread at the same time."
      className="rounded-[28px] border border-line bg-board bg-dot-grid shadow-[0_30px_60px_-30px_rgba(18,18,42,0.25)]"
    >
      {(layout) => (layout === 'compact' ? <CompactStage /> : <WideStage />)}
    </ScaledStage>
  )
}
