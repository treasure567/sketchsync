import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-3">
          <ButtonLink to="/signup" variant="ghost" className="max-sm:hidden">
            Sign Up
          </ButtonLink>
          <ButtonLink to="/board">Open whiteboard</ButtonLink>
        </div>
      </nav>
    </header>
  )
}
