import { Trash2, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router'
import { wipeLocalData } from '@/lib/profile'

export function DangerZone() {
  const navigate = useNavigate()

  const deleteAccount = () => {
    const confirmed = window.confirm(
      'Delete your account? This permanently removes your profile, every board, library item and setting saved in this browser. This cannot be undone.',
    )
    if (!confirmed) return
    wipeLocalData()
    // Full reload so every in-memory cache starts empty.
    navigate('/')
    window.location.reload()
  }

  return (
    <section aria-labelledby="danger-heading" className="rounded-2xl bg-[#fdeef0] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-red text-white">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="danger-heading" className="text-xl font-bold tracking-tight text-[#b4232f]">
            Danger Zone
          </h2>
          <p className="text-xs text-ink-muted">Irreversible account lifecycle procedures and data wipeout.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-xl bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">Delete account &amp; wipe workspace assets</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Permanently removes your SketchSync profile, all whiteboard canvases, library items and settings stored on this device. This action cannot be revoked.
          </p>
        </div>
        <button type="button" onClick={deleteAccount} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#c81e2c] px-4 text-sm font-semibold text-white hover:bg-[#a51824]">
          <Trash2 className="size-4" />
          Delete account
        </button>
      </div>
    </section>
  )
}
