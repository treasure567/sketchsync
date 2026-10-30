import clsx from 'clsx'
import { CreditCard, LayoutGrid, Paintbrush, Plug, SlidersHorizontal, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Menu } from '@/components/ui/Menu'
import { useProfile } from '@/hooks/useProfile'

type NavItem = { label: string; icon: LucideIcon } & ({ to: string } | { onClick: () => void } | { soon: true })

function SidebarLink({ item, active }: { item: NavItem; active?: boolean }) {
  const className = clsx(
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    active ? 'bg-brand-100 font-semibold text-brand-600' : 'text-ink-muted hover:bg-brand-50 hover:text-ink',
  )
  const content = (
    <>
      <item.icon className="size-4" aria-hidden="true" />
      <span className="flex-1 text-left">{item.label}</span>
    </>
  )
  if ('to' in item) {
    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    )
  }
  if ('onClick' in item) {
    return (
      <button type="button" onClick={item.onClick} aria-current={active ? 'page' : undefined} className={className}>
        {content}
      </button>
    )
  }
  return (
    <span aria-disabled="true" title="Coming soon" className={clsx(className, 'cursor-default opacity-60 hover:bg-transparent hover:text-ink-muted')}>
      {content}
      <span className="rounded bg-brand-50 px-1.5 text-[9px] font-semibold tracking-wider uppercase">Soon</span>
    </span>
  )
}

type SettingsLayoutProps = {
  children: ReactNode
  onOpenBilling: () => void
  onOpenProfile: () => void
}

/** Settings sidebar and top navigation around a settings page. */
export function SettingsLayout({ children, onOpenBilling, onOpenProfile }: SettingsLayoutProps) {
  const navigate = useNavigate()
  const profile = useProfile()
  const [accountOpen, setAccountOpen] = useState(false)

  const workspace: NavItem[] = [
    { label: 'Dashboard', icon: LayoutGrid, to: '/dashboard' },
    { label: 'Analytics', icon: TrendingUp, soon: true },
  ]
  const settings: NavItem[] = [
    { label: 'General', icon: SlidersHorizontal, onClick: onOpenProfile },
    {
      label: 'Canvas Defaults',
      icon: Paintbrush,
      onClick: () => {
        onOpenProfile()
        requestAnimationFrame(() => document.getElementById('canvas-defaults')?.scrollIntoView({ behavior: 'smooth' }))
      },
    },
    { label: 'Team & Members', icon: Users, soon: true },
    { label: 'Integrations', icon: Plug, soon: true },
    { label: 'Subscription & Billing', icon: CreditCard, onClick: onOpenBilling },
  ]

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Workspace" className="mt-8">
          <h2 className="px-3 text-[10px] font-bold tracking-wider text-ink-subtle uppercase">Workspace</h2>
          <ul className="mt-2 space-y-0.5">
            {workspace.map((item) => (
              <li key={item.label}>
                <SidebarLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Settings" className="mt-6">
          <h2 className="px-3 text-[10px] font-bold tracking-wider text-ink-subtle uppercase">Settings suite</h2>
          <ul className="mt-2 space-y-0.5">
            {settings.map((item) => (
              <li key={item.label}>
                <SidebarLink item={item} active={item.label === 'General'} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-line p-3 shadow-sm">
          <span className="grid size-9 place-items-center rounded-lg bg-accent-teal text-white">
            <CreditCard className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-ink">Free Plan</span>
            <span className="block text-[11px] text-ink-muted">Personal workspace</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-1 border-b border-line bg-surface/90 px-4 backdrop-blur sm:gap-6 sm:px-8">
          <span className="lg:hidden">
            <Logo />
          </span>
          <nav aria-label="Main" className="flex gap-1 text-sm font-medium max-sm:hidden sm:gap-5">
            <NavLink to="/dashboard" className="text-ink hover:text-brand-600">
              Canvas Workspace
            </NavLink>
            <NavLink to="/dashboard" className="text-ink hover:text-brand-600">
              Projects
            </NavLink>
            <NavLink to="/dashboard?templates" className="text-ink hover:text-brand-600">
              Templates
            </NavLink>
          </nav>
          <div className="relative ml-auto">
            <button type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)} className="rounded-full">
              <Avatar name={profile.name} src={profile.avatar} className="size-9 text-xs" />
            </button>
            {accountOpen && (
              <Menu
                label="Account"
                onClose={() => setAccountOpen(false)}
                className="absolute top-11 right-0"
                items={[
                  { label: 'Dashboard', icon: LayoutGrid, onSelect: () => navigate('/dashboard') },
                  { label: 'Sign out', onSelect: () => navigate('/') },
                ]}
              />
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  )
}
