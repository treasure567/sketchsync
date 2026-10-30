import clsx from 'clsx'

export const outlineButton =
  'flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface text-sm font-medium text-ink transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export const primaryButton =
  'flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60'

export const secondaryButton = clsx(outlineButton, 'disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-surface')
