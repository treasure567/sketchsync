import clsx from 'clsx'
import { CircleHelp, Hand, Map as MapIcon, Minus, Plus, Redo2, Scan, ShieldCheck, Undo2 } from 'lucide-react'
import { Kbd } from '@/components/ui/Kbd'

const group = 'pointer-events-auto flex items-center rounded-lg bg-surface shadow-sm ring-1 ring-line'
const iconButton = 'grid size-8 place-items-center rounded-lg text-ink hover:bg-brand-50 disabled:text-ink-subtle disabled:hover:bg-transparent'

type BoardControlsProps = {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onZoomToFit: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

/** Zoom and undo/redo controls for the bottom-left corner. */
export function BoardControls({ zoom, onZoomIn, onZoomOut, onResetZoom, onZoomToFit, canUndo, canRedo, onUndo, onRedo }: BoardControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={group}>
        <button type="button" aria-label="Zoom out" title="Zoom out — Ctrl −" onClick={onZoomOut} className={iconButton}>
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to 100%`}
          title="Reset zoom — Ctrl 0"
          onClick={onResetZoom}
          className="h-8 min-w-12 rounded-md px-1 text-[11px] font-semibold text-ink tabular-nums hover:bg-brand-50"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in — Ctrl +" onClick={onZoomIn} className={iconButton}>
          <Plus className="size-3.5" />
        </button>
        <span className="h-4 w-px bg-line" />
        <button type="button" aria-label="Zoom to fit" title="Zoom to fit — Shift 1" onClick={onZoomToFit} className={iconButton}>
          <Scan className="size-3.5" />
        </button>
      </div>
      <div className={group}>
        <button type="button" aria-label="Undo" title="Undo — Ctrl Z" disabled={!canUndo} onClick={onUndo} className={iconButton}>
          <Undo2 className="size-3.5" />
        </button>
        <button type="button" aria-label="Redo" title="Redo — Ctrl Shift Z" disabled={!canRedo} onClick={onRedo} className={iconButton}>
          <Redo2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

type BoardStatusProps = {
  minimapOpen: boolean
  onToggleMinimap: () => void
  onHelp: () => void
}

/** Offline-save notice, minimap toggle and help for the bottom-right corner. */
export function BoardStatus({ minimapOpen, onToggleMinimap, onHelp }: BoardStatusProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <span className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[11px] text-ink-muted shadow-sm ring-1 ring-line max-sm:hidden">
        <ShieldCheck className="size-3.5 text-accent-green" aria-hidden="true" />
        All changes saved offline
      </span>
      <button
        type="button"
        aria-label={minimapOpen ? 'Hide minimap' : 'Show minimap'}
        title="Minimap"
        aria-pressed={minimapOpen}
        onClick={onToggleMinimap}
        className={clsx('grid size-8 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-line hover:bg-brand-50', minimapOpen ? 'text-brand-600' : 'text-ink')}
      >
        <MapIcon className="size-4" />
      </button>
      <button type="button" aria-label="Keyboard shortcuts and help" title="Shortcuts & help — ?" onClick={onHelp} className="grid size-8 place-items-center rounded-full bg-surface text-ink shadow-sm ring-1 ring-line hover:bg-brand-50">
        <CircleHelp className="size-4" />
      </button>
    </div>
  )
}

/** Hint under the toolbar; the default one explains panning. */
export function CanvasHint({ hint }: { hint?: string }) {
  return (
    <p className="flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-[11px] text-ink-muted backdrop-blur">
      <Hand className="size-3.5" aria-hidden="true" />
      {hint ?? (
        <>
          To move canvas, hold <Kbd>Space</Kbd> while dragging, or select Hand
        </>
      )}
    </p>
  )
}
