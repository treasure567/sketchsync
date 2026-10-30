import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { CheckEmailCard } from '@/components/auth/signin/CheckEmailCard'
import { SignUpCard } from '@/components/auth/SignUpCard'

/*
 * Sign-up is not connected to a server yet: social buttons go straight to the
 * dashboard, and the email option shows the check-your-email step.
 */
export function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <AuthLayout>
      {sent ? (
        <CheckEmailCard email={email} onUseAnotherAddress={() => setSent(false)} />
      ) : (
        <SignUpCard email={email} onEmailChange={setEmail} onEmailSubmit={() => setSent(true)} onProvider={() => navigate('/dashboard')} />
      )}
    </AuthLayout>
  )
}
