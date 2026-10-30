import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { CheckEmailCard } from '@/components/auth/signin/CheckEmailCard'
import { LinkExpiredCard } from '@/components/auth/signin/LinkExpiredCard'
import { RequestLinkCard } from '@/components/auth/signin/RequestLinkCard'

type Step = 'request' | 'sent' | 'expired'

/*
 * Passwordless sign-in. An expired magic link lands on /signin?link=expired.
 * Sending is not wired to a backend yet: submitting only moves to the next step,
 * and the social buttons go straight to the dashboard.
 */
export function SignInPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const continueToDashboard = () => navigate('/dashboard')
  const [step, setStep] = useState<Step>(searchParams.get('link') === 'expired' ? 'expired' : 'request')
  const [email, setEmail] = useState('')

  const returnToLogin = () => {
    setSearchParams({}, { replace: true })
    setStep('request')
  }

  return (
    <AuthLayout star>
      {step === 'request' && <RequestLinkCard onProvider={continueToDashboard} email={email} onEmailChange={setEmail} onSubmit={() => setStep('sent')} />}
      {step === 'sent' && <CheckEmailCard email={email} onUseAnotherAddress={returnToLogin} />}
      {step === 'expired' && (
        <LinkExpiredCard onProvider={continueToDashboard} email={email} onEmailChange={setEmail} onRequestNewLink={() => setStep('sent')} onReturnToLogin={returnToLogin} />
      )}
    </AuthLayout>
  )
}
