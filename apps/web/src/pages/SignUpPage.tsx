import { SignUpCard } from '@/components/auth/SignUpCard'
import { TestimonialCarousel } from '@/components/auth/TestimonialCarousel'
import { Navbar } from '@/components/layout/Navbar'

/** Faint pencil arcs in the background, as if someone sketched on the page. */
function BackgroundDoodles() {
  return (
    <svg
      viewBox="0 0 160 80"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-6 left-[40%] hidden w-40 text-line lg:block"
    >
      <path d="M10 70 C 30 20, 90 10, 120 60" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M86 18 l8 -8 l8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SignUpPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar authLink="signin" />
      <main className="relative flex flex-1 items-center overflow-hidden py-10 sm:py-16">
        <BackgroundDoodles />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-20">
          <div className="hidden max-w-lg lg:block">
            <TestimonialCarousel />
          </div>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <SignUpCard />
          </div>
        </div>
      </main>
    </div>
  )
}
