import { WandSparkles } from 'lucide-react'
import { Link } from 'react-router'
import { AuthCard, HandTitle, ProviderButton, TermsNotice } from '@/components/auth/AuthCard'
import { primaryButton } from '@/components/auth/buttonStyles'

export function SignUpCard() {
  return (
    <AuthCard>
      <HandTitle>Start from here!</HandTitle>
      <p className="mt-5 text-sm text-ink-muted">Choose your favourite sign up option!</p>

      <div className="mt-5 space-y-3">
        <ProviderButton provider="Google" />
        <ProviderButton provider="GitHub" />
        <ProviderButton provider="Facebook" />
      </div>

      <p className="my-3 text-center text-[11px] font-medium text-ink-subtle">OR</p>

      <button type="button" className={primaryButton}>
        <WandSparkles className="size-[18px]" />
        Passwordless sign-up with email
      </button>

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
