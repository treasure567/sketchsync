import clsx from 'clsx'
import { MessageSquare, SendHorizontal, ThumbsUp } from 'lucide-react'

export function ThreadPanel({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-line bg-surface shadow-md', className)}>
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
        <MessageSquare className="size-4 text-brand-500" />
        <p className="text-[13px] font-bold text-ink">Thread: Node Architecture</p>
      </div>

      <div className="p-3">
        <div className="rounded-lg bg-brand-50 p-3">
          <div className="flex gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-teal text-xs font-bold text-white">EA</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold text-ink">Elena Alvarez</p>
                <p className="text-[10px] text-ink-subtle">2m ago</p>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink">Should we connect the wireframe node directly to user auth?</p>
              <div className="mt-2 flex items-center gap-2.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded bg-brand-100 px-1.5 py-0.5 text-brand-600">
                  <ThumbsUp className="size-3 fill-current" />2
                </span>
                <span className="text-ink-muted">Reply</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line py-1.5 pr-1.5 pl-3">
          <span className="flex-1 text-xs text-ink-subtle">Write a reply or @mention...</span>
          <span className="grid size-7 place-items-center rounded-md bg-brand-500 text-white">
            <SendHorizontal className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  )
}
