import clsx from 'clsx'

export function WebhookCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface p-3.5 shadow-lg', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink">Stripe Webhook</p>
        <span className="size-2 rounded-full bg-accent-green" />
      </div>
      <p className="mt-2.5 rounded-md bg-brand-50 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-ink-muted">
        POST /api/checkout-session
      </p>
      <p className="mt-2.5 text-[11px] font-medium text-accent-green">HTTP 200 OK (38ms)</p>
    </div>
  )
}
