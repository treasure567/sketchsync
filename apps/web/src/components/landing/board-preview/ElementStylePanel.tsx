import clsx from 'clsx'
import { BringToFront, SendToBack, SlidersHorizontal } from 'lucide-react'

const strokeColors = ['#5b4cf5', '#f0475e', '#f59e0b', '#16a06a', '#1f2433']
const strokeWidths = ['Thin', 'Medium', 'Bold']
const fillPatterns = ['None', 'Solid', 'Hatch', 'Cross']

function Label({ children }: { children: string }) {
  return <p className="mb-2 text-xs font-bold text-ink">{children}</p>
}

export function ElementStylePanel({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-3.5 shadow-md', className)}>
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-ink">ELEMENT STYLE</p>
        <SlidersHorizontal className="size-3.5 text-ink-muted" />
      </div>

      <Label>Stroke Color</Label>
      <div className="mb-4 flex gap-2">
        {strokeColors.map((color, index) => (
          <span
            key={color}
            className={clsx('size-[18px] rounded-full', index === 0 && 'ring-2 ring-ink ring-offset-2')}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <Label>Stroke Width</Label>
      <div className="mb-4 grid grid-cols-3 gap-0.5 rounded-lg bg-brand-50 p-0.5">
        {strokeWidths.map((width) => (
          <span
            key={width}
            className={clsx(
              'rounded-md py-1.5 text-center text-[11px]',
              width === 'Medium' ? 'bg-brand-100 font-bold text-brand-600' : 'text-ink-muted',
            )}
          >
            {width}
          </span>
        ))}
      </div>

      <Label>Fill Pattern</Label>
      <div className="mb-4 grid grid-cols-4 gap-1">
        {fillPatterns.map((pattern) => (
          <span
            key={pattern}
            className={clsx(
              'rounded-md border py-1.5 text-center text-[10px]',
              pattern === 'Hatch' ? 'border-brand-600 font-bold text-brand-600' : 'border-line text-ink-muted',
            )}
          >
            {pattern}
          </span>
        ))}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-ink">Opacity</p>
        <p className="text-[11px] text-ink-muted">85%</p>
      </div>
      <div className="mb-4 h-1.5 rounded-full bg-line">
        <div className="h-full w-[85%] rounded-full bg-brand-600" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink">Layer Order</p>
        <div className="flex gap-2 text-ink-muted">
          <BringToFront className="size-3.5" />
          <SendToBack className="size-3.5" />
        </div>
      </div>
    </div>
  )
}
