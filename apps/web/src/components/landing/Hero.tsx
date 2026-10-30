import { LogoMark } from '@/components/brand/LogoMark'
import { BoardPreview } from '@/components/landing/BoardPreview'
import { CurvedArrowDown, Squiggle, StarOutline, Swoosh } from '@/components/landing/Doodles'
import { NameTag } from '@/components/landing/NameTag'
import { ButtonLink } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14 pb-16 sm:pt-20">
      {/* Decorations: hidden on small screens so they never cover the copy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 mx-auto hidden h-96 max-w-6xl lg:block">
        <NameTag name="Maya (Design lead)" tone="yellow" className="absolute top-10 left-[11%] -rotate-3" />
        <NameTag name="Samuel (Design Lead)" tone="blue" className="absolute top-[15.5rem] left-[2%] -rotate-2" />
        <NameTag name="Alex (CSC & Econs.)" tone="violet" className="absolute top-36 right-[3%] rotate-6" />
        <NameTag name="Prof. Gambo (SWE)" tone="pink" className="absolute top-[14.5rem] right-[6%] rotate-1" />
        <StarOutline className="absolute top-10 right-[15%] size-9 rotate-12 text-[#5a3d1e]" />
        <Squiggle className="absolute top-44 left-[19%] size-12 text-accent-teal" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6">
        <h1 className="text-[2.5rem] leading-[1.1] font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-[3.5rem]">
          Online{' '}
          <span className="relative inline-block pr-4 pl-1 font-hand text-[1.05em] font-bold tracking-normal text-brand-500 italic">
            Whiteboard
            <Swoosh className="absolute -bottom-1 left-0 h-4 w-full text-brand-500" />
          </span>{' '}
          made simple
        </h1>

        <p className="mt-5 text-base text-ink-muted sm:text-lg">Ideate, collaborate, share. Simply with SketchSync.</p>

        <div className="mt-4 flex flex-col items-center text-brand-500" aria-hidden="true">
          <span className="-rotate-3 font-hand text-xl font-semibold">jump right in</span>
          <CurvedArrowDown className="h-7 w-5" />
        </div>

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <ButtonLink to="/board/new" size="lg" className="sm:min-w-52">
            <LogoMark className="size-5" />
            Start sketch for free
          </ButtonLink>
          <ButtonLink to="/signup" variant="secondary" size="lg" className="sm:min-w-52">
            Sign Up
          </ButtonLink>
        </div>
      </div>

      <div className="relative mx-auto mt-14 max-w-7xl px-4 sm:mt-20 sm:px-6">
        <BoardPreview />
      </div>
    </section>
  )
}
