import { CircleHelp, FolderOpen, Pin, Radio, StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import { HandUnderline } from '@/components/landing/Doodles'
import { Kbd } from '@/components/ui/Kbd'

type WelcomeOverlayProps = {
  onOpenFile: () => void
  onDropSticky: () => void
  onStartSession: () => void
  onShowShortcuts: () => void
}

type MenuItemProps = {
  icon: ReactNode
  label: string
  description?: string
  trailing: ReactNode
  onClick?: () => void
}

function MenuItem({ icon, label, description, trailing, onClick }: MenuItemProps) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-brand-50">
        <span className="shrink-0 text-ink" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">{label}</span>
          {description && <span className="block text-[11px] text-ink-subtle">{description}</span>}
        </span>
        {trailing}
      </button>
    </li>
  )
}

/** Shown on an empty board: a hint, a quick-start menu and an example sticky note. */
export function WelcomeOverlay({ onOpenFile, onDropSticky, onStartSession, onShowShortcuts }: WelcomeOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
      <div
        aria-hidden="true"
        className="absolute top-[36%] left-[5%] w-40 -rotate-6 rounded-sm bg-sticky p-3 shadow-[0_10px_24px_-12px_rgba(60,50,10,0.45)] max-lg:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-[#b4610e]">IDEATION</span>
          <Pin className="size-3 rotate-45 text-accent-orange" />
        </div>
        <p className="mt-2 font-hand text-lg leading-5 text-[#7a3e0e]">Try clicking tools above or pressing shortcuts! 🚀</p>
      </div>

      <div className="flex w-full max-w-md flex-col items-center">
        <p className="font-hand text-xl font-semibold text-brand-600 sm:text-2xl">
          Your boards{' '}
          <span className="relative inline-block">
            autosave and sync
            <HandUnderline className="absolute inset-x-0 -bottom-1 h-2 w-full text-accent-teal-line" />
          </span>{' '}
          in real time.
        </p>

        <ul className="pointer-events-auto mt-6 w-full rounded-2xl bg-surface p-2 shadow-[0_24px_60px_-30px_rgba(18,18,42,0.35)] ring-1 ring-line">
          <MenuItem icon={<FolderOpen className="size-4" />} label="Open local diagram" trailing={<Kbd>⌘O</Kbd>} onClick={onOpenFile} />
          <MenuItem
            icon={<Radio className="size-4 text-accent-teal" />}
            label="Live collaboration session"
            description="Invite squad with live cursor tracking"
            onClick={onStartSession}
            trailing={
              <span className="flex -space-x-1" aria-hidden="true">
                <span className="grid size-5 place-items-center rounded-full bg-accent-teal-soft text-[8px] font-bold text-accent-teal ring-2 ring-surface">M</span>
                <span className="grid size-5 place-items-center rounded-full bg-sticky text-[8px] font-bold text-[#b4610e] ring-2 ring-surface">K</span>
                <span className="grid size-5 place-items-center rounded-full bg-brand-100 text-[8px] font-bold text-brand-600 ring-2 ring-surface">+3</span>
              </span>
            }
          />
          <MenuItem icon={<StickyNote className="size-4 text-accent-orange" />} label="Drop a sticky note" trailing={<Kbd>N</Kbd>} onClick={onDropSticky} />
          <MenuItem icon={<CircleHelp className="size-4" />} label="Keyboard shortcuts & Help" trailing={<Kbd>?</Kbd>} onClick={onShowShortcuts} />
        </ul>
      </div>
    </div>
  )
}
