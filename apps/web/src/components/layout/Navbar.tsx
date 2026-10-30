import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'

const authLinks = {
  signup: { to: '/signup', label: 'Sign Up' },
  signin: { to: '/signin', label: 'Sign in' },
}

type NavbarProps = {
  /** Which auth page the text link points to. */
  authLink?: keyof typeof authLinks
}

export function Navbar({ authLink = 'signup' }: NavbarProps) {
  const { to, label } = authLinks[authLink]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Hidden on phones: each page repeats this link in its own content */}
          <ButtonLink to={to} variant="ghost" className="max-sm:hidden">
            {label}
          </ButtonLink>
          <ButtonLink to="/board">Open whiteboard</ButtonLink>
        </div>
      </nav>
    </header>
  )
}
