import clsx from 'clsx'
import { Check, CloudCheck, PenLine } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useProfile } from '@/hooks/useProfile'
import { avatarFromFile, saveProfile, type InkDynamics, type Profile } from '@/lib/profile'
import { timeAgo } from '@/lib/time'

const CURSOR_COLORS = ['#4f46e5', '#2e7d72', '#a07c36', '#cc4646', '#6d5bf5', '#b9b3f2', '#5fd9c2', '#c4bff3']
const MAX_AVATAR_BYTES = 4 * 1024 * 1024

const inkOptions: { id: InkDynamics; label: string; description: string; preview: { width: number; d: string } }[] = [
  { id: 'vector', label: 'Vector Clean', description: 'Ultra-smooth curves.', preview: { width: 2, d: 'M4 18 C 20 4, 36 4, 52 14 S 76 22, 92 8' } },
  { id: 'architectural', label: 'Architectural', description: 'Natural felt-tip tactile.', preview: { width: 3, d: 'M4 18 C 20 4, 36 4, 52 14 S 76 22, 92 8' } },
  { id: 'charcoal', label: 'Rough Charcoal', description: 'Expansive sketch grit.', preview: { width: 5, d: 'M4 18 C 21 3, 35 6, 52 13 S 77 23, 92 8' } },
]

type Draft = Omit<Profile, 'savedAt'>

function toDraft({ savedAt: _savedAt, ...rest }: Profile): Draft {
  return rest
}

function validate(draft: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!draft.name.trim()) errors.name = 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Enter a valid email address.'
  if (!/^[a-z0-9_-]{3,30}$/i.test(draft.handle)) errors.handle = 'Use 3–30 letters, numbers, dashes or underscores.'
  return errors
}

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </label>
      {children}
      <p id={`${htmlFor}-hint`} className={clsx('mt-1.5 text-[11px]', error ? 'text-accent-red' : 'text-ink-muted')}>
        {error ?? hint}
      </p>
    </div>
  )
}

const inputClass = 'h-10 w-full rounded-lg bg-brand-50 px-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-brand-500 aria-invalid:ring-accent-red'

/** Personal profile and collaborator identity, saved together with one button. */
export function ProfileForm() {
  const profile = useProfile()
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile))
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const errors = validate(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(profile))
  const valid = Object.keys(errors).length === 0
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_AVATAR_BYTES) return setAvatarError('That image is over 4 MB. Choose a smaller one.')
    try {
      update({ avatar: await avatarFromFile(file) })
      setAvatarError(null)
    } catch {
      setAvatarError('That file could not be read as an image.')
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid || !dirty) return
    saveProfile({ ...draft, name: draft.name.trim(), email: draft.email.trim(), role: draft.role.trim() })
    setNow(Date.now())
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section aria-labelledby="profile-heading" className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="profile-heading" className="text-xl font-bold tracking-tight text-ink">
          Personal Profile
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Update your public presence, organization identity, and communication handle.</p>

        <div className="mt-6 flex flex-col gap-4 rounded-xl bg-brand-50 p-5 sm:flex-row sm:items-center">
          <Avatar name={draft.name} src={draft.avatar} className="size-20 text-2xl ring-4 ring-surface" />
          <div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="h-8 rounded-lg bg-surface px-3 text-xs font-semibold text-ink shadow-sm hover:bg-brand-100">
                Change avatar
              </button>
              {draft.avatar && (
                <button type="button" onClick={() => update({ avatar: null })} className="h-8 rounded-lg px-3 text-xs font-semibold text-accent-red hover:bg-[#fde8ea]">
                  Remove
                </button>
              )}
            </div>
            <p className={clsx('mt-2 text-[11px]', avatarError ? 'text-accent-red' : 'text-ink-muted')} role={avatarError ? 'alert' : undefined}>
              {avatarError ?? 'Recommended: square JPG, SVG or PNG, at least 400×400px. Maximum size: 4MB.'}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={chooseAvatar} />
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="profile-name" hint="Displayed across active team canvas rooms." error={errors.name}>
            <input id="profile-name" value={draft.name} onChange={(event) => update({ name: event.target.value })} aria-invalid={!!errors.name} aria-describedby="profile-name-hint" autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Email Address" htmlFor="profile-email" hint="Used for sync logs and security alerts." error={errors.email}>
            <input id="profile-email" type="email" value={draft.email} onChange={(event) => update({ email: event.target.value })} aria-invalid={!!errors.email} aria-describedby="profile-email-hint" autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Canvas Handle" htmlFor="profile-handle" hint="Your permanent workspace direct-link tag." error={errors.handle}>
            <div className="flex h-10 items-center overflow-hidden rounded-lg bg-brand-50 ring-1 ring-transparent focus-within:ring-brand-500 has-aria-invalid:ring-accent-red">
              <span className="flex h-full items-center bg-brand-100 px-2.5 font-mono text-[11px] text-ink-muted">sketchsync.dev/</span>
              <input
                id="profile-handle"
                value={draft.handle}
                onChange={(event) => update({ handle: event.target.value.replace(/\s/g, '') })}
                aria-invalid={!!errors.handle}
                aria-describedby="profile-handle-hint"
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none"
              />
            </div>
          </Field>
          <Field label="Workspace Role" htmlFor="profile-role" hint="Visible on collaborator lists and board cards.">
            <input id="profile-role" value={draft.role} onChange={(event) => update({ role: event.target.value })} aria-describedby="profile-role-hint" className={inputClass} />
          </Field>
        </div>
      </section>

      <section id="canvas-defaults" aria-labelledby="identity-heading" className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 id="identity-heading" className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
          <PenLine className="size-5 text-brand-500" aria-hidden="true" />
          Collaborator Identity &amp; Stroke Defaults
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Customize your multiplayer presence, live cursor signature, and default sketching physics.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,16rem)]">
          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Live Cursor Color</legend>
              <p className="mt-0.5 text-xs text-ink-muted">Teammates track your real-time actions and viewport bounding boxes in this tint.</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {CURSOR_COLORS.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input type="radio" name="cursor-color" value={color} checked={draft.cursorColor === color} onChange={() => update({ cursorColor: color })} className="peer sr-only" />
                    <span
                      className="grid size-8 place-items-center rounded-full text-white ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500"
                      style={{ backgroundColor: color }}
                    >
                      {draft.cursorColor === color && <Check className="size-4" />}
                      <span className="sr-only">{color}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-3 text-xs text-ink-muted">
                <span className="flex items-center gap-2 rounded-md bg-brand-50 px-2.5 py-1 font-mono text-ink">
                  <span className="size-3 rounded-full" style={{ backgroundColor: draft.cursorColor }} />
                  {draft.cursorColor.toUpperCase()}
                </span>
                Applied to bounding frames &amp; selections.
              </p>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">Freehand Ink Dynamics</legend>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {inkOptions.map((option) => (
                  <label
                    key={option.id}
                    className={clsx(
                      'flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-brand-500',
                      draft.ink === option.id ? 'border-brand-200 bg-brand-100/60' : 'border-line bg-brand-50/50 hover:bg-brand-50',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">{option.label}</span>
                      <input type="radio" name="ink" value={option.id} checked={draft.ink === option.id} onChange={() => update({ ink: option.id })} className="accent-brand-600" />
                    </span>
                    <span className="text-[11px] text-ink-muted">{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <figure aria-label="Live canvas simulation" className="relative min-h-48 overflow-hidden rounded-xl bg-brand-50 p-4">
            <span className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-ink shadow-sm">Viewport 100%</span>
            <span className="absolute top-3 right-4 rotate-2 font-hand text-base font-semibold text-[#a16207]">“Ready to wireframe”</span>
            <svg viewBox="0 0 96 26" className="absolute top-16 left-6 w-32" fill="none" aria-hidden="true">
              <path d={inkOptions.find((option) => option.id === draft.ink)!.preview.d} stroke="#1f2433" strokeWidth={inkOptions.find((option) => option.id === draft.ink)!.preview.width} strokeLinecap="round" />
            </svg>
            <span className="absolute top-[52%] left-[38%] flex items-start">
              <svg viewBox="0 0 16 16" className="size-4" style={{ color: draft.cursorColor }} aria-hidden="true">
                <path d="M1.5 1.5l12 5-5.2 1.6-1.7 5.4z" fill="currentColor" stroke="white" strokeWidth={1.2} strokeLinejoin="round" />
              </svg>
              <span className="mt-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white" style={{ backgroundColor: draft.cursorColor }}>
                {draft.name.trim() || 'You'} (Host)
              </span>
            </span>
            <span className="absolute right-4 bottom-4 rounded-md border-l-[3px] bg-surface px-2.5 py-1 text-[10px] text-ink shadow-sm" style={{ borderColor: draft.cursorColor }}>
              Selected node: Architecture
            </span>
          </figure>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-muted" role="status">
          <CloudCheck className="size-4 text-accent-green" aria-hidden="true" />
          {justSaved ? 'Changes saved' : profile.savedAt ? `Last saved ${timeAgo(profile.savedAt, now)}` : 'Not saved yet'}
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => setDraft(toDraft(profile))}
            className="h-10 rounded-lg bg-brand-100 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!dirty || !valid}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="size-4" />
            Save changes
          </button>
        </div>
      </div>
    </form>
  )
}
