import { ArrowLeft, Hourglass, RefreshCw, Unlink } from 'lucide-react'
import type { FormEvent } from 'react'
import { AuthCard, HandTitle, OrDivider, ProviderButton } from '@/components/auth/AuthCard'
import { primaryButton } from '@/components/auth/buttonStyles'
import { EmailField } from '@/components/auth/EmailField'

/** Dashed light-bulb doodle hanging off the card's top-left corner. */
function BulbDoodle() {
  return (
    <svg viewBox="0 0 64 72" fill="none" aria-hidden="true" className="absolute -top-14 -left-8 w-16 text-[#cfd3e0] max-sm:hidden">
      <circle cx="32" cy="34" r="15" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M26 54h12M28 59h8M32 4v6M8 14l4 4M56 14l-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

type LinkExpiredCardProps = {
  email: string
  onEmailChange: (email: string) => void
  onRequestNewLink: () => void
  onReturnToLogin: () => void
}

export function LinkExpiredCard({ email, onEmailChange, onRequestNewLink, onReturnToLogin }: LinkExpiredCardProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onRequestNewLink()
  }

  return (
    <AuthCard doodle={false}>
      <BulbDoodle />

      <div className="text-center">
        <div className="relative mx-auto mb-5 size-16" aria-hidden="true">
          <span className="grid size-full -rotate-6 place-items-center rounded-xl border-[1.5px] border-dashed border-accent-red/60 bg-[#fde8ea] text-accent-red">
            <Hourglass className="size-7" strokeWidth={1.8} />
          </span>
          <Unlink className="absolute -right-2 -bottom-1.5 size-4 text-accent-red" strokeWidth={2.2} />
          <span className="absolute -top-1.5 -right-2.5 h-px w-2.5 rotate-[-40deg] bg-accent-red" />
          <span className="absolute -right-1.5 -bottom-3 h-2.5 w-px -rotate-30 bg-accent-red" />
        </div>

        <HandTitle shortUnderline underline="text-accent-red">
          Oops, link expired!
        </HandTitle>

        <p className="mt-6 text-sm font-semibold text-ink">That link has expired. Request a new one.</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-muted">
          Magic links are only valid for 15 minutes for your security. Enter your email again or use instant sign-in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <EmailField value={email} onChange={onEmailChange} label="Sign-in email address" editable />
        <button type="submit" className={primaryButton}>
          <RefreshCw className="size-[18px]" />
          Request a new magic link
        </button>
      </form>

      <OrDivider>or sign in with</OrDivider>

      <div className="grid grid-cols-2 gap-3">
        <ProviderButton provider="Google" compact />
        <ProviderButton provider="GitHub" compact />
      </div>

      <button
        type="button"
        onClick={onReturnToLogin}
        className="mx-auto mt-6 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft className="size-3.5" />
        Return to login
      </button>
    </AuthCard>
  )
}
