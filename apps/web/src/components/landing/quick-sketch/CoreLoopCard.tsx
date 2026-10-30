import clsx from 'clsx'

export function CoreLoopCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-lg border-[1.5px] border-brand-200 bg-surface p-4 shadow-lg', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-brand-600">Core Loop</p>
        <span className="size-2 rounded-full bg-accent-green" />
      </div>

      <div className="mt-3 grid h-[68px] place-items-center rounded-md border border-line bg-brand-50/50">
        <svg viewBox="0 0 120 24" className="h-6 w-32" fill="none" aria-hidden="true">
          <path d="M4 16 C 22 4, 36 6, 52 14 S 84 22, 98 10 S 112 8, 116 10" stroke="#4b3ce6" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>

      <p className="mt-2.5 font-hand text-[15px] text-ink">frictionless ideation sketch</p>
    </div>
  )
}
