import clsx from 'clsx'
import type { ReactNode } from 'react'

const tones = {
  yellow: 'bg-sticky border-[#f0d27a]',
  pink: 'bg-[#fde1e7] border-[#f6b8c6]',
  mint: 'bg-[#d9f5e8] border-[#a8e3c8]',
}

type MiniNoteProps = {
  tone: keyof typeof tones
  children: ReactNode
  className?: string
}

/** Small handwritten sticky note used inside thumbnails. */
export function MiniNote({ tone, children, className }: MiniNoteProps) {
  return (
    <span className={clsx('absolute rounded-sm border px-1.5 py-1 font-hand text-[11px] leading-tight text-sticky-ink shadow-sm', tones[tone], className)}>
      {children}
    </span>
  )
}
