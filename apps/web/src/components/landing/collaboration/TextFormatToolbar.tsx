import clsx from 'clsx'

const swatches = [
  { fill: '#fdf1c4', ring: '#f5c451' },
  { fill: '#d6efff', ring: '#7cc4f2' },
  { fill: '#e4e0ff', ring: '#b3a9f7' },
]

export function TextFormatToolbar({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-md', className)}>
      <span className="px-2 text-xs font-medium text-ink">Plus Jakarta Sans</span>
      <span className="grid size-7 place-items-center rounded-md bg-brand-100 text-xs font-extrabold text-ink">B</span>
      <span className="grid size-7 place-items-center text-xs text-ink italic">I</span>
      <span className="grid size-7 place-items-center text-xs text-ink underline">U</span>
      <span className="mx-1.5 h-5 w-px bg-line" />
      <div className="flex gap-1.5 pr-1">
        {swatches.map(({ fill, ring }) => (
          <span key={fill} className="size-[18px] rounded-full border-[1.5px]" style={{ backgroundColor: fill, borderColor: ring }} />
        ))}
      </div>
    </div>
  )
}
