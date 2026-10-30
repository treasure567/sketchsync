import clsx from 'clsx'
import { CreditCard } from 'lucide-react'

/** Wireframe of a mobile checkout screen, drawn as a board element. */
export function CheckoutPhone({ className }: { className?: string }) {
  return (
    <div className={clsx('flex h-[254px] w-[264px] flex-col rounded-2xl border-[1.5px] border-ink bg-surface px-3.5 pt-2.5 pb-3.5 shadow-xl', className)}>
      <span className="mx-auto h-1 w-12 rounded-full bg-line" />
      <span className="mt-4 h-4 rounded bg-brand-50" />

      <div className="mt-4 flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50">
        <CreditCard className="size-4 text-brand-500" />
        <p className="font-mono text-[10px] font-bold text-brand-600">Payment Method</p>
      </div>

      <div className="mt-3.5 flex h-8 items-center rounded-md border border-line bg-brand-50 px-2.5 font-mono text-[10px] tracking-wider text-ink-muted">
        •••• •••• •••• 4242
      </div>

      <div className="mt-1 grid h-8 place-items-center rounded-md bg-brand-700 text-[13px] font-semibold text-white">Confirm Order</div>
    </div>
  )
}
