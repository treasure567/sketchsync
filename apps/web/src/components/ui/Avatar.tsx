import clsx from 'clsx'
import { initials } from '@/lib/profile'

type AvatarProps = {
  name: string
  src?: string | null
  className?: string
}

/** Profile picture, or initials on a brand circle when there is none. */
export function Avatar({ name, src, className }: AvatarProps) {
  return src ? (
    <img src={src} alt="" className={clsx('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span className={clsx('grid shrink-0 place-items-center rounded-full bg-brand-500 font-bold text-white', className)} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
