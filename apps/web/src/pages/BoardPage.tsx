import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BoardEditor } from '@/components/board/BoardEditor'
import { LogoMark } from '@/components/brand/LogoMark'
import { useBoards } from '@/hooks/useBoards'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { createBoard } from '@/lib/boards/store'
import { getTemplate } from '@/lib/boards/templates'

/** Opens the board in the URL (/board/:boardId, or a share link /b/:boardId). */
export function BoardPage() {
  const { boardId } = useParams()
  const board = useBoards().find((entry) => entry.id === boardId && entry.trashedAt === null)
  useDocumentTitle(board?.name ?? 'Board not found')

  if (!board) {
    return (
      <main className="grid min-h-full place-items-center bg-canvas px-4 text-center">
        <div>
          <LogoMark className="mx-auto size-10 text-brand-500" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Board not found</h1>
          <p className="mt-2 text-sm text-ink-muted">It may have been deleted, moved to the trash, or saved in another browser.</p>
          <Link to="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
            Go to your boards
          </Link>
        </div>
      </main>
    )
  }

  return <BoardEditor key={board.id} board={board} />
}

/** Creates a board (optionally from ?template=) and opens it. */
export function NewBoardPage() {
  useDocumentTitle('New board')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const created = useRef(false)

  useEffect(() => {
    // Guard against React running the effect twice in development.
    if (created.current) return
    created.current = true
    const template = getTemplate(searchParams.get('template'))
    const board = createBoard({ name: template.name, type: template.type, elements: template.build() })
    navigate(`/board/${board.id}`, { replace: true })
  }, [navigate, searchParams])

  return null
}
