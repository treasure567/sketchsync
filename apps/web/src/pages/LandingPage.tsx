import { Features } from '@/components/landing/Features'
import { Hero } from '@/components/landing/Hero'
import { Navbar } from '@/components/landing/Navbar'

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
      </main>
    </>
  )
}
