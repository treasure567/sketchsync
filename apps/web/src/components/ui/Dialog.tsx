import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type DialogProps = {
  title: string
  description?: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/** Modal dialog on the native <dialog> element, which traps focus and closes on Escape. */
export function Dialog({ title, description, icon, onClose, children, footer, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === dialogRef.current) onClose()
      }}
      aria-labelledby="dialog-title"
      className={clsx(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-surface p-0 text-ink shadow-[0_30px_80px_-30px_rgba(18,18,42,0.5)] backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="flex items-start gap-3 px-6 pt-6">
        {icon && <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 id="dialog-title" className="text-lg font-bold">
            {title}
          </h2>
          {description && <p className="truncate text-xs text-ink-muted">{description}</p>}
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-brand-50 hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-6 py-4">{footer}</div>}
    </dialog>
  )
}
