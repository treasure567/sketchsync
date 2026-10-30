import clsx from 'clsx'

export type NameTagTone = 'yellow' | 'blue' | 'violet' | 'pink'

const tones: Record<NameTagTone, { bg: string; dot: string }> = {
  yellow: { bg: 'bg-[#fdf1c4]', dot: 'bg-accent-orange' },
  blue: { bg: 'bg-[#dcebfb]', dot: 'bg-accent-blue' },
  violet: { bg: 'bg-brand-100', dot: 'bg-brand-500' },
  pink: { bg: 'bg-[#fde1e1]', dot: 'bg-accent-red' },
}

type NameTagProps = {
  name: string
  tone: NameTagTone
  className?: string
}

/** Small presence label floating around the hero, one per participant. */
export function NameTag({ name, tone, className }: NameTagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap text-ink shadow-sm',
        tones[tone].bg,
        className,
      )}
    >
      <span className={clsx('size-1.5 rounded-full', tones[tone].dot)} />
      {name}
    </span>
  )
}
