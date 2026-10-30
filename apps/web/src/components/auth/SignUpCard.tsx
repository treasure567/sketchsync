import { WandSparkles } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router'
import { FacebookIcon, GitHubIcon, GoogleIcon } from '@/components/brand/SocialIcons'
import { HandUnderline } from '@/components/landing/Doodles'

const providers: { name: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { name: 'Google', icon: GoogleIcon },
  { name: 'GitHub', icon: GitHubIcon },
  { name: 'Facebook', icon: FacebookIcon },
]

/** Squiggle ending in a dot, decorating the card's top-right corner. */
function CornerDoodle() {
  return (
    <svg viewBox="0 0 64 28" fill="none" aria-hidden="true" className="absolute top-6 right-6 w-16 text-brand-200">
      <path d="M2 24c8 0 10-10 18-10s8 8 16 6 10-12 20-14" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="58" cy="5" r="3" fill="currentColor" />
    </svg>
  )
}

export function SignUpCard() {
  return (
    <div className="relative w-full rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(18,18,42,0.3)] sm:p-8">
      <CornerDoodle />

      <h1 className="relative inline-block font-hand text-[2rem] leading-none font-bold text-ink">
        Start from here!
        <HandUnderline className="absolute inset-x-0 -bottom-2 h-2 w-full text-brand-500" weight={2.5} />
      </h1>
      <p className="mt-5 text-sm text-ink-muted">Choose your favourite sign up option!</p>

      <div className="mt-5 space-y-3">
        {providers.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface text-sm font-medium text-ink transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <Icon className="size-[18px]" />
            Continue with {name}
          </button>
        ))}
      </div>

      <p className="my-3 text-center text-[11px] font-medium text-ink-subtle">OR</p>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <WandSparkles className="size-[18px]" />
        Passwordless sign-up with email
      </button>

      <p className="mt-5 text-center text-sm text-ink">
        Already have an account?{' '}
        <Link to="/signin" className="text-brand-600 underline underline-offset-2 hover:text-brand-700">
          Log in
        </Link>
      </p>

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
    </div>
  )
}
