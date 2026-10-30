import clsx from 'clsx'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Ban,
  Check,
  CircleHelp,
  Copy,
  Grid3x3,
  Library,
  Lock,
  LockOpen,
  PaintBucket,
  Pipette,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { LayerMove } from '@/lib/board/actions'
import type { ElementStyle, ElementType, FillStyle, StrokeStyle } from '@/lib/board/types'

const STROKE_COLORS = ['#1f2433', '#4f46e5', '#16a06a', '#f59e0b', '#ef4444']
const BACKGROUND_COLORS = ['transparent', '#fde2e7', '#dcfce7', '#dbeafe', '#fef3c7']
const STROKE_WIDTHS = [
  { value: 1, label: 'Thin' },
  { value: 2, label: 'Medium' },
  { value: 4, label: 'Bold' },
]

const shapeTypes: ElementType[] = ['rectangle', 'diamond', 'ellipse']
const has = (types: ReadonlySet<ElementType>, ...wanted: ElementType[]) => wanted.some((type) => types.has(type))

type StylePanelProps = {
  title: string
  /** Element types the panel applies to; sections show only when relevant. */
  types: ReadonlySet<ElementType>
  style: ElementStyle
  onStyleChange: (patch: Partial<ElementStyle>) => void
  onHelp: () => void
  /** Present when elements are selected (not just a tool). */
  selection?: {
    locked: boolean
    onLayer: (move: LayerMove) => void
    onDuplicate: () => void
    onToggleLock: () => void
    onAddToLibrary: () => void
    onDelete: () => void
  }
  className?: string
}

function Section({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-2.5 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-wider text-ink uppercase">{label}</h3>
        {value && <span className="font-mono text-[10px] text-ink-subtle uppercase">{value}</span>}
      </div>
      {children}
    </section>
  )
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string; content: ReactNode }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-0.5 rounded-lg bg-brand-50 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
          className={clsx(
            'grid h-7 place-items-center rounded-md text-[11px] transition-colors',
            option.value === value ? 'bg-surface font-semibold text-brand-600 shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.content}
        </button>
      ))}
    </div>
  )
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (color: string) => void }) {
  const custom = !colors.includes(value)
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={color === 'transparent' ? 'None' : color}
          title={color === 'transparent' ? 'None' : color}
          onClick={() => onChange(color)}
          className={clsx(
            'grid size-6 place-items-center rounded-md border border-black/10',
            color === value && 'ring-2 ring-brand-500 ring-offset-1',
            color === 'transparent' && 'bg-surface text-ink-muted',
          )}
          style={color === 'transparent' ? undefined : { backgroundColor: color }}
        >
          {color === 'transparent' && <Ban className="size-3.5" />}
          {color === value && color !== 'transparent' && <Check className="size-3 text-white mix-blend-difference" />}
        </button>
      ))}
      <label
        title="Custom colour"
        className={clsx(
          'relative grid size-6 cursor-pointer place-items-center rounded-md border border-line text-ink-muted hover:bg-brand-50',
          custom && 'ring-2 ring-brand-500 ring-offset-1',
        )}
        style={custom ? { backgroundColor: value } : undefined}
      >
        {!custom && <Pipette className="size-3.5" />}
        <span className="sr-only">Custom {label.toLowerCase()} colour</span>
        <input
          type="color"
          value={custom ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

const HatchIcon = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <path d="M2 10 10 2M6 14l8-8M2 14 14 2" />
  </svg>
)

const fillStyles: { value: FillStyle | 'none'; label: string; content: ReactNode }[] = [
  { value: 'hatch', label: 'Hatch', content: <HatchIcon /> },
  { value: 'cross', label: 'Cross-hatch', content: <Grid3x3 className="size-3.5" /> },
  { value: 'solid', label: 'Solid', content: <PaintBucket className="size-3.5" /> },
  { value: 'none', label: 'No fill', content: <Ban className="size-3.5" /> },
]

const strokeStyles: { value: StrokeStyle; label: string; content: ReactNode }[] = [
  { value: 'solid', label: 'Solid', content: <span className="h-0.5 w-7 rounded bg-current" /> },
  { value: 'dashed', label: 'Dashed', content: <span className="w-7 border-t-2 border-dashed border-current" /> },
  { value: 'dotted', label: 'Dotted', content: <span className="w-7 border-t-2 border-dotted border-current" /> },
]

const iconButton = 'grid h-8 place-items-center rounded-lg bg-brand-50 text-ink transition-colors hover:bg-brand-100'

export function StylePanel({ title, types, style, onStyleChange, onHelp, selection, className }: StylePanelProps) {
  const hasShape = has(types, ...shapeTypes)
  const showStroke = has(types, ...shapeTypes, 'line', 'arrow', 'freedraw', 'text')
  const showBackground = has(types, ...shapeTypes, 'freedraw', 'sticky')
  const showStrokeWidth = has(types, ...shapeTypes, 'line', 'arrow', 'freedraw')
  const showStrokeStyle = has(types, ...shapeTypes, 'line', 'arrow')
  const lastFillColor = style.fill === 'transparent' ? BACKGROUND_COLORS[3] : style.fill

  return (
    <aside aria-label="Element style" className={clsx('rounded-2xl border border-line bg-surface px-4 py-2 shadow-[0_18px_40px_-20px_rgba(18,18,42,0.35)]', className)}>
      <div className="flex items-center justify-between border-b border-line py-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <button type="button" aria-label="Keyboard shortcuts and help" title="Shortcuts & help" onClick={onHelp} className="text-ink-muted hover:text-ink">
          <CircleHelp className="size-4" />
        </button>
      </div>

      {showStroke && (
        <Section label={types.has('text') && types.size === 1 ? 'Text colour' : 'Stroke'} value={style.stroke}>
          <Swatches label="Stroke" colors={STROKE_COLORS} value={style.stroke} onChange={(stroke) => onStyleChange({ stroke })} />
        </Section>
      )}

      {showBackground && (
        <Section label={types.has('sticky') && types.size === 1 ? 'Note colour' : 'Background'} value={style.fill === 'transparent' ? 'none' : style.fill}>
          <Swatches label="Background" colors={BACKGROUND_COLORS} value={style.fill} onChange={(fill) => onStyleChange({ fill })} />
        </Section>
      )}

      {hasShape && (
        <Section label="Fill style">
          <Segmented
            label="Fill style"
            options={fillStyles}
            value={style.fill === 'transparent' ? 'none' : style.fillStyle}
            onChange={(value) => onStyleChange(value === 'none' ? { fill: 'transparent' } : { fillStyle: value, fill: lastFillColor })}
          />
        </Section>
      )}

      {showStrokeWidth && (
        <Section label="Stroke width">
          <Segmented
            label="Stroke width"
            options={STROKE_WIDTHS.map(({ value, label }) => ({
              value,
              label,
              content: <span className="w-7 rounded-full bg-current" style={{ height: value + 0.5 }} />,
            }))}
            value={style.strokeWidth}
            onChange={(strokeWidth) => onStyleChange({ strokeWidth })}
          />
        </Section>
      )}

      {showStrokeStyle && (
        <Section label="Stroke style">
          <Segmented label="Stroke style" options={strokeStyles} value={style.strokeStyle} onChange={(strokeStyle) => onStyleChange({ strokeStyle })} />
        </Section>
      )}

      {types.has('freedraw') && (
        <Section label="Pressure">
          <Segmented
            label="Pressure"
            options={[
              { value: 'fixed', label: 'Fixed width', content: 'Fixed' },
              { value: 'pressure', label: 'Pressure-sensitive width', content: 'Pressure' },
            ]}
            value={style.pressure ? 'pressure' : 'fixed'}
            onChange={(value) => onStyleChange({ pressure: value === 'pressure' })}
          />
        </Section>
      )}

      {types.has('rectangle') && (
        <Section label="Edges">
          <Segmented
            label="Edges"
            options={[
              { value: 'sharp', label: 'Sharp corners', content: 'Sharp' },
              { value: 'round', label: 'Rounded corners', content: 'Round' },
            ]}
            value={style.rounded ? 'round' : 'sharp'}
            onChange={(value) => onStyleChange({ rounded: value === 'round' })}
          />
        </Section>
      )}

      <Section label="Opacity" value={`${style.opacity}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={style.opacity}
          aria-label="Opacity"
          onChange={(event) => onStyleChange({ opacity: Number(event.target.value) })}
          className="w-full accent-brand-600"
        />
      </Section>

      {selection && (
        <>
          <Section label="Layers">
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" aria-label="Send to back" title="Send to back" onClick={() => selection.onLayer('back')} className={iconButton}>
                <ArrowDownToLine className="size-3.5" />
              </button>
              <button type="button" aria-label="Send backward" title="Send backward" onClick={() => selection.onLayer('backward')} className={iconButton}>
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" aria-label="Bring forward" title="Bring forward" onClick={() => selection.onLayer('forward')} className={iconButton}>
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Bring to front" title="Bring to front" onClick={() => selection.onLayer('front')} className={iconButton}>
                <ArrowUpToLine className="size-3.5" />
              </button>
            </div>
          </Section>
          <Section label="Actions">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5">
              <button type="button" onClick={selection.onDuplicate} title="Duplicate — Ctrl D" className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-50 text-[11px] font-semibold text-ink transition-colors hover:bg-brand-100">
                <Copy className="size-3.5" />
                Dup
              </button>
              <button
                type="button"
                aria-label={selection.locked ? 'Unlock' : 'Lock'}
                title={selection.locked ? 'Unlock' : 'Lock'}
                aria-pressed={selection.locked}
                onClick={selection.onToggleLock}
                className={clsx(iconButton, 'w-8', selection.locked && 'bg-brand-100 text-brand-600')}
              >
                {selection.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
              </button>
              <button type="button" aria-label="Add to library" title="Add to library" onClick={selection.onAddToLibrary} className={clsx(iconButton, 'w-8')}>
                <Library className="size-3.5" />
              </button>
              <button type="button" aria-label="Delete" title="Delete — Del" onClick={selection.onDelete} className={clsx(iconButton, 'w-8 bg-[#fde8ea] text-accent-red hover:bg-[#fbd5da]')}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </Section>
        </>
      )}
    </aside>
  )
}
