import clsx from 'clsx'
import { Bell, CircleUser, CreditCard, Lock, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DangerZone } from '@/components/settings/DangerZone'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { useBoards } from '@/hooks/useBoards'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { FREE_BOARD_LIMIT } from '@/lib/boards/store'

type Tab = 'profile' | 'security' | 'notifications' | 'billing'

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: CircleUser },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
]

function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{text}</p>
    </section>
  )
}

function BillingUsage() {
  const used = useBoards().filter((board) => board.trashedAt === null).length
  return (
    <section aria-labelledby="usage-heading" className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 id="usage-heading" className="text-xl font-bold tracking-tight text-ink">
        Usage
      </h2>
      <p className="mt-1 text-sm text-ink-muted">You are on the free plan. Paid plans are coming soon.</p>
      <div className="mt-6 rounded-xl bg-brand-50 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Boards</span>
          <span className="text-ink-muted">
            {used} of {FREE_BOARD_LIMIT} free boards
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-brand-100" role="progressbar" aria-valuenow={Math.min(used, FREE_BOARD_LIMIT)} aria-valuemin={0} aria-valuemax={FREE_BOARD_LIMIT} aria-label="Free boards used">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(Math.min(used, FREE_BOARD_LIMIT) / FREE_BOARD_LIMIT) * 100}%` }} />
        </div>
        <Link to="/dashboard" className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
          Manage boards →
        </Link>
      </div>
    </section>
  )
}

export function SettingsPage() {
  useDocumentTitle('Account settings')
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <SettingsLayout onOpenBilling={() => setTab('billing')} onOpenProfile={() => setTab('profile')}>
      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
        Settings Suite <span aria-hidden="true">›</span> <span className="font-medium text-brand-600">Account Settings</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">Account Settings</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Manage your personal identity, real-time collaborator flag, and authentication safety.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[10px] font-bold tracking-wider text-ink uppercase">
          <span className="size-1.5 rounded-full bg-accent-green" />
          Saved on this device
        </span>
      </div>

      <div role="tablist" aria-label="Settings sections" className="scrollbar-none mt-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
              tab === id ? 'bg-brand-100 font-semibold text-brand-600' : 'text-ink hover:bg-brand-50',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6 space-y-6">
        {tab === 'profile' && (
          <>
            <ProfileForm />
            <DangerZone />
          </>
        )}
        {tab === 'security' && <ComingSoon title="Security" text="Sign-in methods, active sessions and two-step verification arrive with real accounts." />}
        {tab === 'notifications' && <ComingSoon title="Notifications" text="Email and in-app alerts for mentions, invites and comments arrive with real-time collaboration." />}
        {tab === 'billing' && <BillingUsage />}
      </div>
    </SettingsLayout>
  )
}
