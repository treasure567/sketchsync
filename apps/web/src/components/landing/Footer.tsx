import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'

const columns = [
  {
    title: 'Product',
    links: ['Whiteboard', 'Infinite Canvas', 'Wireframing', 'Real-time Sync'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Shortcut Cheatsheet', 'Community Templates', 'Community Boards', 'API & Plugins'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Blog', 'Open Source', 'Brand Kit'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Security Overview', 'Cookie Settings'],
  },
]

/** Where footer links go; anything without an entry is a page that does not exist yet. */
const destinations: Record<string, string> = {
  Whiteboard: '/board/new',
  'Infinite Canvas': '#features',
  Wireframing: '#quick-sketch',
  'Real-time Sync': '#collaboration',
  Documentation: '/help',
  'Shortcut Cheatsheet': '/help#shortcuts',
  'Community Templates': '/dashboard',
  'Community Boards': '/dashboard',
  'Privacy Policy': '/privacy',
  'Terms of Service': '/terms',
  'Security Overview': '/privacy#security',
  'Cookie Settings': '/privacy#cookies',
}

const currentYear = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-line bg-[#f3f3fb]">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.7fr_repeat(4,1fr)] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              The open, intuitive whiteboard for thinkers and builders. Sketch diagrams, wireframes, and workflows effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-2 lg:col-span-4 lg:grid-cols-4">
            {columns.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h2 className="text-xs font-bold tracking-wider text-ink uppercase">{title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      {destinations[link]?.startsWith('/') ? (
                        <Link to={destinations[link]} className="text-sm text-ink-muted transition-colors hover:text-brand-600">
                          {link}
                        </Link>
                      ) : (
                        <a href={destinations[link] ?? '#'} className="text-sm text-ink-muted transition-colors hover:text-brand-600">
                          {link}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-14 border-t border-line pt-8 text-xs text-ink-muted">
          © {currentYear} SketchSync Studios, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
