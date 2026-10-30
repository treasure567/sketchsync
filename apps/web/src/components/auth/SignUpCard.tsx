import { WandSparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthCard, HandTitle, ProviderButton, TermsNotice } from '@/components/auth/AuthCard'
import { primaryButton } from '@/components/auth/buttonStyles'
import { EmailField } from '@/components/auth/EmailField'

type SignUpCardProps = {
  email: string
  onEmailChange: (email: string) => void
  onEmailSubmit: () => void
  onProvider: () => void
}

export function SignUpCard({ email, onEmailChange, onEmailSubmit, onProvider }: SignUpCardProps) {
  const [showEmail, setShowEmail] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onEmailSubmit()
  }

  return (
    <AuthCard>
      <HandTitle>Start from here!</HandTitle>
      <p className="mt-5 text-sm text-ink-muted">Choose your favourite sign up option!</p>

      <div className="mt-5 space-y-3">
        <ProviderButton provider="Google" onClick={onProvider} />
        <ProviderButton provider="GitHub" onClick={onProvider} />
        <ProviderButton provider="Facebook" onClick={onProvider} />
      </div>

      <p className="my-3 text-center text-[11px] font-medium text-ink-subtle">OR</p>

      {showEmail ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <EmailField value={email} onChange={onEmailChange} label="Your email" />
          <button type="submit" className={primaryButton}>
            <WandSparkles className="size-[18px]" />
            Send me a sign-up link
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setShowEmail(true)} className={primaryButton}>
          <WandSparkles className="size-[18px]" />
          Passwordless sign-up with email
        </button>
      )}

      <p className="mt-5 text-center text-sm text-ink">
        Already have an account?{' '}
        <Link to="/signin" className="text-brand-600 underline underline-offset-2 hover:text-brand-700">
          Log in
        </Link>
      </p>

      <TermsNotice />
    </AuthCard>
  )
}
