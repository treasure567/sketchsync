import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Keyboard key badge, e.g. for shortcut hints. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={clsx(
        'inline-grid h-[18px] min-w-[18px] place-items-center rounded border border-line bg-brand-50 px-1 font-mono text-[9px] font-bold text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
