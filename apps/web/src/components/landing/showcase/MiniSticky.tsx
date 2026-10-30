import clsx from 'clsx'
import type { CSSProperties } from 'react'

export function MiniSticky({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={clsx('rounded-sm border border-[#e9d68a] bg-sticky px-3 py-2 shadow-md', className)}
      style={style}
    >
      <p className="font-hand text-[15px] leading-[1.15] font-semibold text-sticky-ink">
        make CTA sticky
        <br />
        on mobile!
      </p>
    </div>
  )
}
