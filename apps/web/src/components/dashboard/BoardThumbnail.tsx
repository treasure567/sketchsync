import clsx from 'clsx'
import { CircleCheck, GraduationCap, Lightbulb, Palette, UserPlus } from 'lucide-react'
import type { ComponentType } from 'react'
import { MiniNote } from '@/components/dashboard/MiniNote'
import type { BoardThumbnailKind } from '@/components/dashboard/sampleBoards'

function DashedArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 10" fill="none" className={className} aria-hidden="true">
      <path d="M2 5 H52" stroke="#5b4cf5" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M50 1.5 L56 5 50 8.5" stroke="#5b4cf5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Architecture() {
  return (
    <>
      <span className="absolute top-[18%] left-[48%] h-4 w-6 rounded-[50%] bg-[#d9dbe6]" />
      <span className="absolute top-[42%] left-[10%] rounded-md border border-brand-200 bg-surface px-2 py-1 font-mono text-[10px] text-brand-600">API GW</span>
      <DashedArrow className="absolute top-[47%] left-[38%] w-[26%]" />
      <span className="absolute top-[30%] right-[10%] rounded bg-sticky px-1.5 py-0.5 font-mono text-[9px] text-[#8a5a0b]">Redis</span>
      <span className="absolute top-[52%] right-[10%] rounded bg-accent-teal-soft px-1.5 py-0.5 font-mono text-[9px] text-accent-teal">Kafka</span>
      <MiniNote tone="yellow" className="bottom-[10%] left-[14%] -rotate-3">
        +4 tasks open
      </MiniNote>
    </>
  )
}

function Checkout() {
  return (
    <>
      <span className="absolute top-[10%] left-1/2 flex h-[86%] w-[34%] -translate-x-1/2 flex-col gap-1.5 rounded-lg border border-ink/70 bg-surface p-2">
        <span className="h-3 rounded-sm bg-brand-50" />
        <span className="h-5 rounded-sm border border-brand-200 bg-brand-50" />
        <span className="h-2 w-2/3 rounded-sm bg-line" />
        <span className="mt-auto h-3 rounded-sm bg-brand-700" />
      </span>
      <MiniNote tone="pink" className="right-[8%] bottom-[12%] rotate-3">
        Fix CTA contrast on mobile!
      </MiniNote>
    </>
  )
}

function Lecture() {
  return (
    <span className="absolute inset-0 flex flex-col justify-center gap-1.5 px-[12%]">
      <span className="flex items-center gap-1.5 font-hand text-sm font-semibold text-brand-700">
        <Lightbulb className="size-3.5 text-accent-orange" />
        Byzantine Fault Tolerance
      </span>
      <span className="w-fit rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] text-brand-600">n ≥ 3f + 1 consensus</span>
      <span className="font-hand text-xs text-ink-muted">— Lamport &apos;82</span>
    </span>
  )
}

function Sprint() {
  return (
    <>
      <MiniNote tone="yellow" className="top-[30%] left-[7%] w-[27%] -rotate-3">
        Use SketchSync tunnels for demos
        <span className="mt-1 flex gap-0.5">
          <span className="size-1.5 rounded-full bg-accent-red" />
          <span className="size-1.5 rounded-full bg-accent-red" />
        </span>
      </MiniNote>
      <MiniNote tone="pink" className="top-[28%] left-[37%] w-[27%] rotate-2">
        Scrap the signup wall
      </MiniNote>
      <MiniNote tone="mint" className="top-[32%] right-[7%] w-[27%] -rotate-2">
        Brainstorm on key flows
      </MiniNote>
    </>
  )
}

function Styleguide() {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <span className="flex gap-2">
        {['bg-brand-500', 'bg-accent-teal', 'bg-sticky', 'bg-ink'].map((color) => (
          <span key={color} className={clsx('size-6 rounded-md shadow-sm', color)} />
        ))}
      </span>
      <span className="flex items-center gap-1 font-hand text-sm font-semibold text-ink">
        Primary &amp; Accents
        <Palette className="size-3.5 text-brand-500" />
      </span>
    </span>
  )
}

function Journey() {
  const steps = [
    { label: 'Sign Up', icon: UserPlus },
    { label: 'Tutorial', icon: GraduationCap },
    { label: 'Active', icon: CircleCheck },
  ]
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-1.5 px-3">
      {steps.map(({ label, icon: Icon }, index) => (
        <span key={label} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-[10px] text-ink-subtle">→</span>}
          <span className="flex flex-col items-center gap-1">
            <span className="grid size-7 place-items-center rounded-md border border-brand-200 bg-surface text-brand-600">
              <Icon className="size-3.5" />
            </span>
            <span className="text-[9px] text-ink-muted">{label}</span>
          </span>
        </span>
      ))}
    </span>
  )
}

function Sync() {
  return (
    <>
      <svg viewBox="0 0 200 110" fill="none" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M66 38 H128" stroke="#8c8ca1" strokeWidth={1.2} strokeDasharray="3 3" />
        <path d="M100 40 C 96 60, 80 70, 70 78" stroke="#f0475e" strokeWidth={1.2} strokeDasharray="3 3" />
        <circle cx="100" cy="46" r="3" fill="#d9dbe6" />
      </svg>
      <span className="absolute top-[28%] left-[10%] font-mono text-[9px] font-semibold text-ink">Connecting</span>
      <span className="absolute top-[28%] right-[10%] flex items-center gap-1 font-mono text-[9px] font-semibold text-ink">
        Synced <span className="size-1.5 rounded-full bg-accent-green" />
      </span>
      <span className="absolute bottom-[18%] left-[18%] font-mono text-[9px] font-semibold text-accent-red">Disconnected</span>
    </>
  )
}

const thumbnails: Record<BoardThumbnailKind, ComponentType> = {
  architecture: Architecture,
  checkout: Checkout,
  lecture: Lecture,
  sprint: Sprint,
  styleguide: Styleguide,
  journey: Journey,
  sync: Sync,
}

/** Miniature drawing of a board's contents. */
export function BoardThumbnail({ kind }: { kind: BoardThumbnailKind }) {
  const Thumbnail = thumbnails[kind]
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <Thumbnail />
    </div>
  )
}
