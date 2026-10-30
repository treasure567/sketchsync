import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { CheckEmailCard } from '@/components/auth/signin/CheckEmailCard'
import { LinkExpiredCard } from '@/components/auth/signin/LinkExpiredCard'
import { RequestLinkCard } from '@/components/auth/signin/RequestLinkCard'

type Step = 'request' | 'sent' | 'expired'

/*
 * Passwordless sign-in. An expired magic link lands on /signin?link=expired.
 * Sending is not wired to a backend yet: submitting only moves to the next step.
 */
export function SignInPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<Step>(searchParams.get('link') === 'expired' ? 'expired' : 'request')
  const [email, setEmail] = useState('')

  const returnToLogin = () => {
    setSearchParams({}, { replace: true })
    setStep('request')
  }

  return (
    <AuthLayout star>
      {step === 'request' && <RequestLinkCard email={email} onEmailChange={setEmail} onSubmit={() => setStep('sent')} />}
      {step === 'sent' && <CheckEmailCard email={email} onUseAnotherAddress={returnToLogin} />}
      {step === 'expired' && (
        <LinkExpiredCard email={email} onEmailChange={setEmail} onRequestNewLink={() => setStep('sent')} onReturnToLogin={returnToLogin} />
      )}
    </AuthLayout>
  )
}
