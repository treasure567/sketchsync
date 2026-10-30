import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard, HandTitle, OrDivider, ProviderButton, TermsNotice } from '@/components/auth/AuthCard'
import { primaryButton } from '@/components/auth/buttonStyles'
import { EmailField } from '@/components/auth/EmailField'

type RequestLinkCardProps = {
  email: string
  onEmailChange: (email: string) => void
  onSubmit: () => void
}

export function RequestLinkCard({ email, onEmailChange, onSubmit }: RequestLinkCardProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <AuthCard doodle="outside">
      <HandTitle shortUnderline>Welcome back!</HandTitle>
      <p className="mt-5 text-sm text-ink-muted">Sign in to resume sketching and collaborate.</p>

      <div className="mt-5 space-y-3">
        <ProviderButton provider="Google" />
        <ProviderButton provider="GitHub" />
        <ProviderButton provider="Facebook" />
      </div>

      <OrDivider>or continue with email</OrDivider>

      <form onSubmit={handleSubmit} className="space-y-3">
        <EmailField value={email} onChange={onEmailChange} />
        <button type="submit" className={primaryButton}>
          Send me a magic link
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="ml-1 font-semibold text-brand-600 hover:text-brand-700">
          Sign up
        </Link>
      </p>

      <TermsNotice />
    </AuthCard>
  )
}
