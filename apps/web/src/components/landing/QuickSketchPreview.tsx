import { CommandPalette } from '@/components/landing/quick-sketch/CommandPalette'
import { CoreLoopCard } from '@/components/landing/quick-sketch/CoreLoopCard'
import { NextStepSticky } from '@/components/landing/quick-sketch/NextStepSticky'
import { ShortcutBar } from '@/components/landing/quick-sketch/ShortcutBar'
import { ScaledStage } from '@/components/landing/ScaledStage'
import { Kbd } from '@/components/ui/Kbd'

const WIDE_STAGE = { width: 1360, height: 576 }
const COMPACT_STAGE = { width: 480, height: 760 }

const ink = '#3e30c4'
const teal = '#1f6f5a'

function Arrowheads() {
  return (
    <defs>
      {[
        { id: 'quick-sketch-arrow-ink', color: ink },
        { id: 'quick-sketch-arrow-teal', color: teal },
      ].map(({ id, color }) => (
        <marker key={id} id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M1 1.5L8 5 1 8.5" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      ))}
    </defs>
  )
}

function PickToolNote({ left, top }: { left: number; top: number }) {
  return (
    <span className="absolute -rotate-6 font-hand text-xl font-semibold text-brand-700" style={{ left, top }}>
      Pick a tool
    </span>
  )
}

function StartDrawingNote({ left, top }: { left: number; top: number }) {
  return (
    <span
      className="absolute -rotate-3 rounded-sm bg-accent-teal-soft px-2 font-hand text-xl font-semibold text-accent-teal"
      style={{ left, top }}
    >
      Start drawing!
    </span>
  )
}

function WideStage() {
  return (
    <>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${WIDE_STAGE.width} ${WIDE_STAGE.height}`} fill="none">
        <Arrowheads />
        <path d="M402 70 C 386 50, 368 50, 348 56" stroke={ink} strokeWidth={1.8} strokeLinecap="round" markerEnd="url(#quick-sketch-arrow-ink)" />
        <path d="M980 178 C 1010 172, 1030 184, 1042 204" stroke={teal} strokeWidth={1.8} strokeLinecap="round" markerEnd="url(#quick-sketch-arrow-teal)" />
        <path
          d="M772 300 C 800 306, 830 304, 862 296"
          stroke={teal}
          strokeWidth={2.2}
          strokeDasharray="0.1 6"
          strokeLinecap="round"
          markerEnd="url(#quick-sketch-arrow-teal)"
        />
      </svg>

      <CommandPalette className="absolute top-11 left-7 h-[496px] w-[312px]" />
      <PickToolNote left={410} top={50} />

      <CoreLoopCard className="absolute top-[204px] left-[508px] w-[246px]" />
      <StartDrawingNote left={836} top={160} />
      <NextStepSticky className="absolute top-[236px] left-[878px] w-[212px] rotate-3" />

      <ShortcutBar className="absolute bottom-[18px] left-1/2 -translate-x-1/2" />
    </>
  )
}

function CompactStage() {
  return (
    <>
      <svg className="absolute inset-0 size-full" viewBox={`0 0 ${COMPACT_STAGE.width} ${COMPACT_STAGE.height}`} fill="none">
        <Arrowheads />
        <path d="M384 86 C 372 104, 350 106, 328 96" stroke={ink} strokeWidth={1.8} strokeLinecap="round" markerEnd="url(#quick-sketch-arrow-ink)" />
      </svg>

      <CommandPalette className="absolute top-5 left-4 h-[420px] w-[300px]" />
      <PickToolNote left={334} top={44} />

      <CoreLoopCard className="absolute top-[480px] left-4 w-[246px]" />
      <StartDrawingNote left={290} top={470} />
      <NextStepSticky className="absolute top-[520px] left-[278px] w-[188px] rotate-3" />

      <ShortcutBar className="absolute bottom-[18px] left-1/2 -translate-x-1/2" />
    </>
  )
}

/** The board shown inside a browser window, with its address bar. */
export function QuickSketchPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-[#f8f8fc] shadow-[0_20px_50px_-30px_rgba(18,18,42,0.2)]">
      <div aria-hidden="true" className="flex items-center gap-4 border-b border-line bg-surface px-4 py-3 sm:px-5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 truncate font-mono text-[11px] text-ink-muted">sketchsync.io/w/quick-sketch</span>
        <span className="flex items-center gap-2 rounded-md bg-brand-50 px-2 py-1 font-mono text-[11px] text-ink">
          <span className="max-sm:hidden">Command Palette</span>
          <Kbd className="bg-surface">⌘K</Kbd>
        </span>
      </div>

      <ScaledStage
        wide={WIDE_STAGE}
        compact={COMPACT_STAGE}
        label="SketchSync open in a browser with the command palette listing drawing tools and their shortcut keys, a Core Loop sketch card linked to a Next Step sticky note, and a keyboard shortcut bar."
      >
        {(layout) => (layout === 'compact' ? <CompactStage /> : <WideStage />)}
      </ScaledStage>
    </div>
  )
}
