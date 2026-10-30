import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { LogoMark } from '@/components/brand/LogoMark'
import { NotFoundPage } from '@/components/layout/MessagePage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/**
 * Shown when a page fails to render or its code fails to load (e.g. after a
 * deploy, or offline before the page was cached). Boards autosave, so a reload
 * loses at most the last fraction of a second of work.
 */
export function ErrorPage() {
  const error = useRouteError()
  useDocumentTitle('Something went wrong')

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)

  return (
    <main className="grid min-h-full place-items-center bg-canvas px-4 text-center">
      <div className="max-w-md">
        <LogoMark className="mx-auto size-10 text-brand-500" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {chunkFailed
            ? 'This page could not be downloaded. Check your connection and try again.'
            : 'SketchSync hit an unexpected error. Your boards are saved on this device, so reloading is safe.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
            Reload page
          </button>
          <Link to="/dashboard" reloadDocument className="inline-flex h-11 items-center rounded-lg bg-brand-50 px-5 text-sm font-semibold text-ink hover:bg-brand-100">
            Go to your boards
          </Link>
        </div>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mt-6 overflow-auto rounded-lg bg-surface p-3 text-left text-[11px] text-accent-red">{error.stack ?? error.message}</pre>
        )}
      </div>
    </main>
  )
}
