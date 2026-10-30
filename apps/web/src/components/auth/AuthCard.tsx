import clsx from 'clsx'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { FacebookIcon, GitHubIcon, GoogleIcon } from '@/components/brand/SocialIcons'
import { outlineButton } from '@/components/auth/buttonStyles'
import { HandUnderline } from '@/components/landing/Doodles'

/** Squiggle ending in a dot, decorating a card's top-right corner. */
function CornerDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" fill="none" aria-hidden="true" className={clsx('absolute w-16 text-brand-200', className)}>
      <path d="M2 24c8 0 10-10 18-10s8 8 16 6 10-12 20-14" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="58" cy="5" r="3" fill="currentColor" />
    </svg>
  )
}

type AuthCardProps = {
  children: ReactNode
  /** Where the corner squiggle sits, or false for none. */
  doodle?: 'inside' | 'outside' | false
  className?: string
}

export function AuthCard({ children, doodle = 'inside', className }: AuthCardProps) {
  return (
    <div
      className={clsx(
        'relative w-full rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(18,18,42,0.3)] sm:p-8',
        className,
      )}
    >
      {doodle === 'inside' && <CornerDoodle className="top-6 right-6" />}
      {doodle === 'outside' && <CornerDoodle className="top-10 -right-10 max-sm:hidden" />}
      {children}
    </div>
  )
}

type HandTitleProps = {
  children: ReactNode
  /** Underline colour class. */
  underline?: string
  /** Underline only the middle of the title instead of all of it. */
  shortUnderline?: boolean
}

/** Handwritten card title with a hand-drawn underline. */
export function HandTitle({ children, underline = 'text-brand-500', shortUnderline = false }: HandTitleProps) {
  return (
    <h1 className="relative inline-block font-hand text-[2rem] leading-none font-bold text-ink">
      {children}
      <HandUnderline
        weight={2.5}
        className={clsx('absolute -bottom-2 h-2', shortUnderline ? 'left-[22%] w-[48%]' : 'inset-x-0 w-full', underline)}
      />
    </h1>
  )
}

export type Provider = 'Google' | 'GitHub' | 'Facebook'

const providerIcons: Record<Provider, ComponentType<SVGProps<SVGSVGElement>>> = {
  Google: GoogleIcon,
  GitHub: GitHubIcon,
  Facebook: FacebookIcon,
}

type ProviderButtonProps = {
  provider: Provider
  /** Show just the provider name, for side-by-side buttons. */
  compact?: boolean
}

export function ProviderButton({ provider, compact = false }: ProviderButtonProps) {
  const Icon = providerIcons[provider]
  return (
    <button type="button" className={outlineButton}>
      <Icon className="size-[18px]" />
      {compact ? provider : `Continue with ${provider}`}
    </button>
  )
}

/** Horizontal rule with a small caption in the middle. */
export function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-4 flex items-center gap-3 text-[10px] font-semibold tracking-wider text-ink-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function TermsNotice() {
  return (
    <p className="mt-6 border-t border-line pt-5 text-center text-xs text-ink-muted">
      By continuing you agree to our{' '}
      <a href="#" className="underline underline-offset-2 hover:text-ink">
        Terms of Use
      </a>{' '}
      and{' '}
      <a href="#" className="underline underline-offset-2 hover:text-ink">
        Privacy Policy
      </a>
      .
    </p>
  )
}
