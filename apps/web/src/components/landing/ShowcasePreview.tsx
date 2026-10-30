import { LiveCursor } from '@/components/landing/board-preview/LiveCursor'
import { ScaledStage } from '@/components/landing/ScaledStage'
import { CheckoutPhone } from '@/components/landing/showcase/CheckoutPhone'
import { ComponentLibraryPanel } from '@/components/landing/showcase/ComponentLibraryPanel'
import { MiniSticky } from '@/components/landing/showcase/MiniSticky'
import { WebhookCard } from '@/components/landing/showcase/WebhookCard'

const WIDE_STAGE = { width: 1360, height: 550 }
const COMPACT_STAGE = { width: 480, height: 500 }

type ConnectorProps = { d: string }

/** Dotted arrow from the phone's connection handle to the webhook card. */
function DottedConnector({ d }: ConnectorProps) {
  return (
    <>
      <path d={d} stroke="#3e30c4" strokeWidth={2.2} strokeDasharray="0.1 6" strokeLinecap="round" />
      <path d={d} stroke="none" markerEnd="url(#showcase-arrowhead)" />
    </>
  )
}

function ArrowheadDefs() {
  return (
    <defs>
      <marker id="showcase-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M1 1.5L8.5 5 1 8.5z" fill="#3e30c4" />
      </marker>
    </defs>
  )
}

/** Grey connection handle peeking out from behind the phone. */
function ConnectionHandle({ left, top }: { left: number; top: number }) {
  return <span className="absolute h-11 w-9 rounded-[50%] bg-[#d9dbe6]" style={{ left, top }} />
}

function WideStage() {
  return (
    <>
      <ComponentLibraryPanel className="absolute top-[38px] left-[26px] h-[476px] w-[244px]" />

      <ConnectionHandle left={700} top={256} />
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${WIDE_STAGE.width} ${WIDE_STAGE.height}`} fill="none">
        <ArrowheadDefs />
        <DottedConnector d="M756 284 C 800 286, 840 276, 888 258" />
      </svg>

      <CheckoutPhone className="absolute top-[150px] left-[456px]" />
      <MiniSticky className="absolute top-[362px] left-[668px] -rotate-[8deg]" />
      <WebhookCard className="absolute top-[218px] left-[896px] w-52" />

      <LiveCursor label="Nina (Design)" color="#3e30c4" style={{ left: 1160, top: 70 }} />
    </>
  )
}

function CompactStage() {
  return (
    <>
      <ConnectionHandle left={268} top={160} />
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${COMPACT_STAGE.width} ${COMPACT_STAGE.height}`} fill="none">
        <ArrowheadDefs />
        <DottedConnector d="M306 184 C 360 196, 372 260, 362 334" />
      </svg>

      <CheckoutPhone className="absolute top-14 left-6" />
      <MiniSticky className="absolute top-[282px] left-[214px] -rotate-[8deg]" />
      <WebhookCard className="absolute top-[344px] left-[248px] w-52" />

      <LiveCursor label="Nina (Design)" color="#3e30c4" style={{ left: 330, top: 20 }} />
    </>
  )
}

export function ShowcasePreview() {
  return (
    <ScaledStage
      wide={WIDE_STAGE}
      compact={COMPACT_STAGE}
      label="A SketchSync board with a component library panel, a mobile checkout wireframe connected to a Stripe webhook card, and a sticky note."
      className="rounded-3xl border border-line bg-[#f8f8fc] shadow-[0_20px_50px_-30px_rgba(18,18,42,0.2)]"
    >
      {(layout) => (layout === 'compact' ? <CompactStage /> : <WideStage />)}
    </ScaledStage>
  )
}
