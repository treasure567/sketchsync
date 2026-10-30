import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white shadow-[0_6px_16px_-6px] shadow-brand-500/60 hover:bg-brand-600',
  secondary: 'bg-surface text-ink border border-line shadow-sm hover:bg-brand-50',
  ghost: 'text-ink hover:text-brand-600',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant
  size?: Size
}

export function ButtonLink({ variant = 'primary', size = 'sm', className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
