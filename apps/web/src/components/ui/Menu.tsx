import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'

export type MenuEntry =
  | {
      label: string
      icon?: LucideIcon
      shortcut?: string
      onSelect: () => void
      danger?: boolean
      disabled?: boolean
      /** Shows a check mark, for options. */
      checked?: boolean
    }
  | 'separator'

type MenuProps = {
  label: string
  items: MenuEntry[]
  onClose: () => void
  className?: string
  style?: CSSProperties
}

/** A floating menu. Closes on Escape, outside clicks and selection; arrow keys move between items. */
export function Menu({ label, items, onClose, className, style }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    // Defer so the click that opened the menu doesn't close it.
    const timer = setTimeout(() => window.addEventListener('pointerdown', onPointerDown))
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const moveFocus = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={moveFocus}
      className={clsx('z-50 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-[0_18px_40px_-16px_rgba(18,18,42,0.35)]', className)}
      style={style}
    >
      {items.map((item, index) =>
        item === 'separator' ? (
          <div key={`separator-${index}`} role="separator" className="my-1 h-px bg-line" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onSelect()
            }}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs outline-none disabled:opacity-40',
              item.danger ? 'text-accent-red hover:bg-[#fde8ea] focus:bg-[#fde8ea]' : 'text-ink hover:bg-brand-50 focus:bg-brand-50',
            )}
          >
            {item.icon ? <item.icon className="size-3.5 shrink-0" aria-hidden="true" /> : <span className="w-3.5" />}
            <span className="flex-1">{item.label}</span>
            {item.checked && <span className="text-brand-600">✓</span>}
            {item.shortcut && <span className="font-mono text-[10px] text-ink-subtle">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  )
}
