import { Mail, Pencil } from 'lucide-react'
import { useRef } from 'react'

type EmailFieldProps = {
  value: string
  onChange: (value: string) => void
  /** Visible label; without one the field is labelled for screen readers only. */
  label?: string
  /** Show a pencil button that focuses the field, for a prefilled address. */
  editable?: boolean
}

export function EmailField({ value, onChange, label, editable = false }: EmailFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <label className="block">
      <span className={label ? 'mb-1.5 block text-xs font-medium text-ink' : 'sr-only'}>{label ?? 'Email address'}</span>
      <span className="flex h-12 items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <Mail className="size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="ada@email.com"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        {editable && (
          <button
            type="button"
            aria-label="Edit email address"
            onClick={() => inputRef.current?.select()}
            className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-brand-50 hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </span>
    </label>
  )
}
