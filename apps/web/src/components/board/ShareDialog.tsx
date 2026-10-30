import clsx from 'clsx'
import { CircleAlert, Clock, Copy, Info, Link2, Lock, Mail, Radio, Share2, TriangleAlert, UserCog, Users, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import type { BoardMeta, ShareRole, ShareSettings } from '@/lib/boards/store'

const HOUR = 60 * 60 * 1000
const expiryOptions = [
  { label: '1 hour', ms: HOUR },
  { label: '24 hours', ms: 24 * HOUR },
  { label: '7 days', ms: 7 * 24 * HOUR },
  { label: 'Never', ms: null },
] as const

type Tab = 'live' | 'invite' | 'link'

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'live', label: 'Live collaboration', icon: Users },
  { id: 'invite', label: 'Invite people', icon: Mail },
  { id: 'link', label: 'Share link', icon: Link2 },
]

function timeLeft(expiresAt: number, now: number) {
  const ms = expiresAt - now
  if (ms <= 0) return null
  const hours = Math.floor(ms / HOUR)
  const minutes = Math.floor((ms % HOUR) / 60000)
  return hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours}h ${minutes}m`
}

function RoleSelect({ value, onChange, label }: { value: ShareRole; onChange: (role: ShareRole) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as ShareRole)}
      className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink"
    >
      <option value="edit">Can edit</option>
      <option value="view">Can view</option>
    </select>
  )
}

function Setting({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-brand-600 shadow-sm">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-[11px] text-ink-muted">{description}</span>
      </span>
      {children}
    </div>
  )
}

type ShareDialogProps = {
  board: BoardMeta
  onChange: (share: ShareSettings) => void
  onClose: () => void
}

export function ShareDialog({ board, onChange, onClose }: ShareDialogProps) {
  const [tab, setTab] = useState<Tab>('link')
  const [now, setNow] = useState(() => Date.now())
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ShareRole>('edit')
  const share = board.share
  const update = (patch: Partial<ShareSettings>) => onChange({ ...share, ...patch })

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const url = `${window.location.origin}/b/${board.id}?token=${share.token}`
  const remaining = share.expiresAt ? timeLeft(share.expiresAt, now) : 'never'
  const expired = share.expiresAt !== null && remaining === null
  const linkActive = share.enabled && !expired
  const currentExpiry = share.expiresAt === null ? 'Never' : (expiryOptions.find((option) => option.ms !== null && Math.abs(share.expiresAt! - now - option.ms) < HOUR)?.label ?? 'custom')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  const invite = (event: FormEvent) => {
    event.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    update({ invites: [...share.invites.filter((entry) => entry.email !== email), { email, role: inviteRole }] })
    setInviteEmail('')
  }

  return (
    <Dialog
      title="Share board"
      description={board.name}
      icon={<Share2 className="size-5" />}
      onClose={onClose}
      footer={
        <>
          <p className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <Info className="size-3.5 shrink-0" />
            Anyone with this link can view or edit according to permissions
          </p>
          <button type="button" onClick={onClose} className="h-9 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white hover:bg-brand-600">
            Done ✓
          </button>
        </>
      }
    >
      <div role="tablist" aria-label="Sharing options" className="-mt-2 mb-5 flex gap-4 border-b border-line">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-medium whitespace-nowrap',
              tab === id ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'link' && (
        <div role="tabpanel" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Public shareable URL</h3>
            {linkActive ? (
              <span className="flex items-center gap-1 rounded-full bg-sticky px-2.5 py-1 text-[10px] font-semibold text-[#8a5a0b]">
                <Clock className="size-3" />
                {share.expiresAt ? `Link expires in ${remaining}` : 'Never expires'}
              </span>
            ) : (
              <span className="rounded-full bg-[#fde8ea] px-2.5 py-1 text-[10px] font-semibold text-accent-red">{expired ? 'Link expired' : 'Link disabled'}</span>
            )}
          </div>

          {linkActive ? (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-2 pl-3">
              <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={url}>
                {url}
              </span>
              <button type="button" onClick={copyLink} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600">
                <Copy className="size-3.5" />
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3 text-xs text-ink-muted">
              Nobody can open this board with the old link.
              <button
                type="button"
                onClick={() => update({ enabled: true, token: Math.random().toString(36).slice(2, 8), expiresAt: Date.now() + 24 * HOUR })}
                className="h-8 shrink-0 rounded-lg bg-brand-500 px-3 font-semibold text-white hover:bg-brand-600"
              >
                Create new link
              </button>
            </div>
          )}

          <div className="rounded-xl bg-brand-50/70 px-4 py-1">
            <h4 className="pt-3 text-[10px] font-bold tracking-wider text-ink-muted uppercase">Access permissions &amp; rules</h4>
            <Setting icon={<UserCog className="size-4" />} title="Default role for link holders" description="Access granted upon opening this board">
              <RoleSelect label="Default role" value={share.role} onChange={(role) => update({ role })} />
            </Setting>
            <Setting icon={<Clock className="size-4" />} title="Link expiration" description="Auto-revokes the link after this period">
              <select
                aria-label="Link expiration"
                value={currentExpiry}
                onChange={(event) => {
                  const option = expiryOptions.find(({ label }) => label === event.target.value)
                  if (option) update({ expiresAt: option.ms === null ? null : Date.now() + option.ms, enabled: true })
                }}
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink"
              >
                {currentExpiry === 'custom' && <option value="custom">Custom</option>}
                {expiryOptions.map(({ label }) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </Setting>
            <Setting icon={<Lock className="size-4" />} title="Require sign-in" description="Guests must sign in or create a free account">
              <button
                type="button"
                role="switch"
                aria-checked={share.requireSignIn}
                aria-label="Require sign-in"
                onClick={() => update({ requireSignIn: !share.requireSignIn })}
                className={clsx('relative h-6 w-11 shrink-0 rounded-full transition-colors', share.requireSignIn ? 'bg-brand-500' : 'bg-line')}
              >
                <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', share.requireSignIn ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </Setting>
          </div>

          {linkActive && (
            <div className="flex items-center gap-3 rounded-xl bg-[#fdecee] p-3">
              <TriangleAlert className="size-4 shrink-0 text-accent-red" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-xs font-semibold text-ink">Immediate link invalidation</span>
                <span className="block text-[11px] text-ink-muted">Anyone with this link will immediately lose access</span>
              </span>
              <button type="button" onClick={() => update({ enabled: false })} className="h-8 shrink-0 rounded-lg border border-[#f6b8c0] bg-surface px-3 text-xs font-semibold text-accent-red hover:bg-[#fde8ea]">
                Disable link
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'invite' && (
        <div role="tabpanel" className="space-y-4">
          <form onSubmit={invite} className="flex gap-2">
            <label className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand-500">
              <Mail className="size-3.5 text-ink-muted" aria-hidden="true" />
              <span className="sr-only">Email address</span>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="classmate@university.edu"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <RoleSelect label="Role for invitee" value={inviteRole} onChange={setInviteRole} />
            <button type="submit" className="h-9 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600">
              Invite
            </button>
          </form>
          {share.invites.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-muted">No one invited yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {share.invites.map((entry) => (
                <li key={entry.email} className="flex items-center gap-3 px-3 py-2">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600 uppercase">{entry.email.slice(0, 2)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs">{entry.email}</span>
                  <RoleSelect
                    label={`Role for ${entry.email}`}
                    value={entry.role}
                    onChange={(role) => update({ invites: share.invites.map((item) => (item.email === entry.email ? { ...item, role } : item)) })}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${entry.email}`}
                    onClick={() => update({ invites: share.invites.filter((item) => item.email !== entry.email) })}
                    className="grid size-7 place-items-center rounded-md text-ink-muted hover:bg-[#fde8ea] hover:text-accent-red"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-ink-muted">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            Invitations are emailed once the SketchSync server is connected; for now they are saved with the board.
          </p>
        </div>
      )}

      {tab === 'live' && (
        <div role="tabpanel" className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-accent-teal-soft/60 p-4">
            <Radio className="mt-0.5 size-5 shrink-0 text-accent-teal" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold">Edit together in real time</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Everyone who opens this board sees each other&apos;s cursors and edits as they happen, and changes made offline merge when they reconnect.
              </p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-[10px] font-bold tracking-wider text-ink-muted uppercase">On this board now</h4>
            <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
              <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">YOU</span>
              <span className="flex-1 text-xs">You (this browser)</span>
              <span className="flex items-center gap-1 text-[10px] text-accent-green">
                <span className="size-1.5 rounded-full bg-accent-green" />
                Online
              </span>
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-ink-muted">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            Live sessions start automatically once the SketchSync sync server is connected. Share the link so others are ready to join.
          </p>
        </div>
      )}
    </Dialog>
  )
}
