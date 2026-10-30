import { Link } from 'react-router'
import { LogoMark } from '@/components/brand/LogoMark'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
      <LogoMark className="size-6 text-brand-500" />
      SketchSync
    </Link>
  )
}
