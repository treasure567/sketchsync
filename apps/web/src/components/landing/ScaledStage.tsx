import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'

type StageSize = { width: number; height: number }

type ScaledStageProps = {
  wide: StageSize
  compact: StageSize
  /** Container widths below this use the compact stage. */
  compactBelow?: number
  label: string
  className?: string
  children: (layout: 'wide' | 'compact') => ReactNode
}

/*
 * Lays an illustration out on a fixed-size stage and scales it to fit, so
 * every element keeps its position relative to the others at any width.
 * Narrow screens get a compact stage instead of a tiny, unreadable wide one.
 */
export function ScaledStage({ wide, compact, compactBelow = 900, label, className, children }: ScaledStageProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const layout = width > 0 && width < compactBelow ? 'compact' : 'wide'
  const stage = layout === 'compact' ? compact : wide
  const scale = width > 0 ? Math.min(width / stage.width, 1) : 1

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className={clsx('relative overflow-hidden', className)}
      style={{ height: stage.height * scale }}
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 origin-top"
        style={{
          width: stage.width,
          height: stage.height,
          transform: `translateX(-50%) scale(${scale})`,
          visibility: width > 0 ? 'visible' : 'hidden',
        }}
      >
        {children(layout)}
      </div>
    </div>
  )
}
