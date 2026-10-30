import type { SVGProps } from 'react'

/** Rough hand-drawn loop wrapped around a word. Stretches to fit its parent. */
export function ScribbleFrame(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" fill="none" aria-hidden="true" {...props}>
      <path
        d="M22 18 C 90 6, 200 4, 282 12 M8 30 C 4 55, 6 74, 14 88 M10 84 C 90 96, 200 98, 296 82"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Loose hand-drawn underline. Stretches to the width of its parent. */
export function HandUnderline({ weight = 3, ...props }: SVGProps<SVGSVGElement> & { weight?: number }) {
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 7 C 40 3, 80 10, 120 6 S 180 4, 197 7"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function CurvedArrowDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2c-1.5 8-1 17 0 27" />
      <path d="M6.5 23.5L12 29.5l5-6.5" />
    </svg>
  )
}

export function Squiggle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M3 36c4-1 6-6 4-10s3-8 7-6 7-1 6-6 4-8 8-7 6-3 8-5" />
    </svg>
  )
}

export function StarOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8l-5.8 3.3 1.5-6.4-4.9-4.3 6.5-.6z" />
    </svg>
  )
}
