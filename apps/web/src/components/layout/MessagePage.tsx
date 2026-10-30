import { Link } from 'react-router'
import { LogoMark } from '@/components/brand/LogoMark'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type MessagePageProps = {
  title: string
  message: string
  action?: { label: string; to: string }
}

/** Full-page notice, e.g. for a missing page or an expired share link. */
export function MessagePage({ title, message, action = { label: 'Go to your boards', to: '/dashboard' } }: MessagePageProps) {
  useDocumentTitle(title)
  return (
    <main className="grid min-h-full place-items-center bg-canvas px-4 text-center">
      <div>
        <LogoMark className="mx-auto size-10 text-brand-500" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{message}</p>
        <Link to={action.to} className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
          {action.label}
        </Link>
      </div>
    </main>
  )
}

export function NotFoundPage() {
  return <MessagePage title="Page not found" message="That page doesn’t exist. Check the address, or head back to SketchSync." action={{ label: 'Go to the home page', to: '/' }} />
}
