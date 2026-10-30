import type { SVGProps } from 'react'

/** Pencil with motion strokes, the SketchSync brand mark. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14.5 4.5l5 5L9 20H4v-5L14.5 4.5z" />
      <path d="M12.5 6.5l5 5" />
      <path d="M3 9.5L8.5 4" />
      <path d="M3 5.5L5 3.5" />
    </svg>
  )
}
