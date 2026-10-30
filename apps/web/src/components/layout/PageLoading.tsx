import { LogoMark } from '@/components/brand/LogoMark'

/** Shown while a page's code is downloading. */
export function PageLoading() {
  return (
    <div className="grid min-h-full place-items-center bg-canvas" role="status">
      <LogoMark className="size-9 animate-pulse text-brand-500 motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
