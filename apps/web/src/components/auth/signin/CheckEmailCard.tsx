import { MailCheck, SquareArrowOutUpRight, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthCard, HandTitle, TermsNotice } from '@/components/auth/AuthCard'
import { primaryButton, secondaryButton } from '@/components/auth/buttonStyles'

const RESEND_COOLDOWN_SECONDS = 30

const webmail: [RegExp, string][] = [
  [/@(gmail|googlemail).com$/, 'https://mail.google.com'],
  [/@(outlook|hotmail|live|msn)./, 'https://outlook.live.com/mail'],
  [/@(yahoo|ymail)./, 'https://mail.yahoo.com'],
  [/@(icloud|me|mac).com$/, 'https://www.icloud.com/mail'],
]

/** The webmail inbox for well-known providers, otherwise the default mail app. */
function inboxUrl(email: string) {
  return webmail.find(([pattern]) => pattern.test(email.toLowerCase()))?.[1] ?? 'mailto:'
}

type CheckEmailCardProps = {
  email: string
  onUseAnotherAddress: () => void
}

export function CheckEmailCard({ email, onUseAnotherAddress }: CheckEmailCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (secondsLeft === 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const resend = () => {
    setSecondsLeft(RESEND_COOLDOWN_SECONDS)
  }

  return (
    <AuthCard className="text-center">
      <div className="mx-auto grid size-28 place-items-center rounded-full bg-radial from-brand-100 to-transparent to-70%" aria-hidden="true">
        <span className="grid size-14 -rotate-3 place-items-center rounded-2xl border border-brand-200 bg-brand-100 text-brand-700 shadow-sm">
          <MailCheck className="size-7" strokeWidth={1.8} />
        </span>
      </div>

      <HandTitle shortUnderline>Check your email</HandTitle>

      <p className="mt-6 text-sm text-ink">
        We sent a magic link to{' '}
        <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700">{email}</span>
      </p>
      <p className="mx-auto mt-3 max-w-xs text-xs text-ink-muted">Click the link in your email to sign in automatically. No password required.</p>

      <div className="mt-6 space-y-3">
        <a href={inboxUrl(email)} target="_blank" rel="noreferrer" className={primaryButton}>
          <SquareArrowOutUpRight className="size-[18px]" />
          Open email app
        </a>
        <button type="button" className={secondaryButton} disabled={secondsLeft > 0} onClick={resend}>
          <Timer className="size-4" />
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend magic link'}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink">
        Wrong email?{' '}
        <button type="button" onClick={onUseAnotherAddress} className="hover:text-brand-600 hover:underline">
          Use another address
        </button>
      </p>

      <TermsNotice />
    </AuthCard>
  )
}
