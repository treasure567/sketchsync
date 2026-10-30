import { Collaboration } from '@/components/landing/Collaboration'
import { Features } from '@/components/landing/Features'
import { Hero } from '@/components/landing/Hero'
import { Navbar } from '@/components/landing/Navbar'
import { Offline } from '@/components/landing/Offline'
import { QuickSketch } from '@/components/landing/QuickSketch'

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Collaboration />
        <Offline />
        <QuickSketch />
      </main>
    </>
  )
}
