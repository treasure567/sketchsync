import clsx from 'clsx'
import { X } from 'lucide-react'

export function NextStepSticky({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-md border border-[#f0d27a] bg-sticky px-4 py-3 shadow-lg', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[#b4610e]">NEXT STEP</p>
        <X className="size-3 text-accent-red" />
      </div>
      <p className="mt-1.5 font-hand text-base leading-5 font-semibold text-sticky-ink">
        Invite teammates via link &amp; export vector SVG!
      </p>
    </div>
  )
}
