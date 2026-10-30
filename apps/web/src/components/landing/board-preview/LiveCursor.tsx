import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'

type LiveCursorProps = {
  label: ReactNode
  color: string
  /** Put the label on the left of the pointer instead of the right. */
  labelSide?: 'right' | 'left'
  className?: string
  style?: CSSProperties
}

/** Another participant's pointer with their name badge. */
export function LiveCursor({ label, color, labelSide = 'right', className, style }: LiveCursorProps) {
  return (
    <div className={clsx('absolute flex items-start', labelSide === 'left' && 'flex-row-reverse', className)} style={style}>
      <svg viewBox="0 0 16 16" className={clsx('size-4 drop-shadow-sm', labelSide === 'left' && '-scale-x-100')} style={{ color }}>
        <path d="M1.5 1.5l12 5-5.2 1.6-1.7 5.4z" fill="currentColor" stroke="white" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
      <span
        className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  )
}
