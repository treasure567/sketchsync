import { Keyboard } from 'lucide-react'
import { tools } from '@/components/board/tools'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd } from '@/components/ui/Kbd'

const general: [string, string][] = [
  ['Undo / redo', 'Ctrl Z · Ctrl Shift Z'],
  ['Cut / copy / paste', 'Ctrl X · Ctrl C · Ctrl V'],
  ['Duplicate', 'Ctrl D'],
  ['Select all', 'Ctrl A'],
  ['Delete selection', 'Del'],
  ['Lock tool after drawing', 'Q'],
  ['Pan the canvas', 'Space + drag'],
  ['Zoom in / out / reset', 'Ctrl + · Ctrl − · Ctrl 0'],
  ['Open / save diagram', 'Ctrl O · Ctrl S'],
  ['Show shortcuts', '?'],
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard shortcuts & help" description="Work faster without leaving the keyboard" icon={<Keyboard className="size-5" />} onClose={onClose} className="max-w-2xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 text-[10px] font-bold tracking-wider text-ink-muted uppercase">Tools</h3>
          <ul className="space-y-1.5">
            {tools
              .filter((tool) => !tool.comingSoon)
              .map(({ id, label, shortcut, icon: Icon }) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 text-ink-muted" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <Kbd>{shortcut}</Kbd>
                </li>
              ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-[10px] font-bold tracking-wider text-ink-muted uppercase">General</h3>
          <ul className="space-y-1.5">
            {general.map(([label, keys]) => (
              <li key={label} className="flex items-center justify-between gap-3 text-sm">
                <span>{label}</span>
                <span className="font-mono text-[11px] text-ink-muted">{keys}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-ink-muted">
            Double-click empty canvas to add text, or a sticky note to edit it. Right-click anything for more actions. On touch screens, pinch to zoom.
          </p>
        </section>
      </div>
    </Dialog>
  )
}
