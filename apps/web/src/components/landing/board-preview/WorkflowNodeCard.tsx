import clsx from 'clsx'
import { ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'

const handlePositions = [
  'top-0 left-0',
  'top-0 left-1/2',
  'top-0 left-full',
  'top-1/2 left-0',
  'top-1/2 left-full',
  'top-full left-0',
  'top-full left-1/2',
  'top-full left-full',
]

type WorkflowNodeCardProps = {
  width: number
  height: number
  className?: string
  style?: CSSProperties
}

/** A selected card on the board, with resize handles, a rotation handle and its size badge. */
export function WorkflowNodeCard({ width, height, className, style }: WorkflowNodeCardProps) {
  return (
    <div className={clsx('absolute', className)} style={{ width, height, ...style }}>
      {/* Card */}
      <div className="absolute inset-2 flex flex-col rounded-lg border border-dashed border-brand-500 bg-linear-to-b from-brand-50 to-surface p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-brand-600">Auth Workflow Node</p>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-600">STATE #02</span>
        </div>

        <div className="mt-4 rounded-md border border-line bg-surface p-2.5 shadow-sm">
          <p className="flex items-center gap-2 font-mono text-[11px] font-semibold text-ink">
            <span className="size-2 rounded-full bg-accent-green" />
            SSO / Token Exchange
          </p>
          <div className="mt-2.5 h-1.5 rounded-full bg-brand-100">
            <div className="h-full w-3/4 rounded-full bg-brand-500" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between text-[11px] text-ink-muted">
          Latency &lt; 40ms
          <ShieldCheck className="size-3.5 fill-brand-500 text-surface" />
        </div>
      </div>

      {/* Selection outline, rotation handle and resize handles */}
      <div className="absolute inset-0 rounded-[2px] border-[1.5px] border-accent-orange" />
      <div className="absolute bottom-full left-1/2 h-5 w-[1.5px] -translate-x-1/2 bg-accent-orange" />
      <div className="absolute bottom-[calc(100%+18px)] left-1/2 size-3 -translate-x-1/2 rounded-full bg-accent-orange" />
      {handlePositions.map((position) => (
        <span key={position} className={clsx('absolute size-2 -translate-1/2 border-[1.5px] border-accent-orange bg-surface', position)} />
      ))}

      {/* Size badge */}
      <span className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 rounded bg-ink px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-white">
        256 × 192 px
      </span>
    </div>
  )
}
