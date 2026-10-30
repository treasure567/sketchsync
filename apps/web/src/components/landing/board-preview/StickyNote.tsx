import clsx from 'clsx'
import { Pin } from 'lucide-react'
import type { CSSProperties } from 'react'

export function StickyNote({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={clsx('rounded-sm bg-sticky p-4 shadow-[0_10px_24px_-12px_rgba(60,50,10,0.45)]', className)} style={style}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[#a2751c]">USER JOURNEY</p>
        <Pin className="size-3 rotate-45 fill-accent-red text-accent-red" />
      </div>
      <p className="font-hand text-xl leading-6 text-sticky-ink">
        Frictionless onboarding: allow free canvas trial before email prompt.
      </p>
    </div>
  )
}
