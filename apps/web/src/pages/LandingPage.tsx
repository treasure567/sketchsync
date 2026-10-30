import { CallToAction } from '@/components/landing/CallToAction'
import { Collaboration } from '@/components/landing/Collaboration'
import { Features } from '@/components/landing/Features'
import { Hero } from '@/components/landing/Hero'
import { Navbar } from '@/components/landing/Navbar'
import { Offline } from '@/components/landing/Offline'
import { QuickSketch } from '@/components/landing/QuickSketch'
import { Testimonials } from '@/components/landing/Testimonials'

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
        <Testimonials />
        <CallToAction />
      </main>
    </>
  )
}
