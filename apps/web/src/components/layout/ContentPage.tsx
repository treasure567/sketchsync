import type { ReactNode } from 'react'
import { Footer } from '@/components/landing/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type ContentPageProps = {
  title: string
  intro: string
  updated?: string
  children: ReactNode
}

/** Long-form text page (help, privacy, terms) with the site navbar and footer. */
export function ContentPage({ title, intro, updated, children }: ContentPageProps) {
  useDocumentTitle(title)
  return (
    <>
      <Navbar />
      <main className="bg-[#fbfbfe] px-4 py-14 sm:px-6 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">{title}</h1>
          <p className="mt-4 text-lg text-ink-muted">{intro}</p>
          {updated && <p className="mt-2 text-xs text-ink-subtle">Last updated {updated}</p>}
          <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-ink [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_li]:mt-1.5 [&_p]:mt-3 [&_section]:scroll-mt-24 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
