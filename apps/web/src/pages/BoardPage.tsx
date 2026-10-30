import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { BoardEditor } from '@/components/board/BoardEditor'
import { MessagePage } from '@/components/layout/MessagePage'
import { useBoards } from '@/hooks/useBoards'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { createBoard, type BoardMeta } from '@/lib/boards/store'
import { getTemplate } from '@/lib/boards/templates'

function useBoardFromUrl() {
  const { boardId } = useParams()
  return useBoards().find((entry) => entry.id === boardId && entry.trashedAt === null)
}

function BoardNotFound() {
  return <MessagePage title="Board not found" message="It may have been deleted, moved to the trash, or saved in another browser." />
}

function Editor({ board }: { board: BoardMeta }) {
  useDocumentTitle(board.name)
  return <BoardEditor key={board.id} board={board} />
}

/** Opens the board at /board/:boardId. */
export function BoardPage() {
  const board = useBoardFromUrl()
  return board ? <Editor board={board} /> : <BoardNotFound />
}

/** Share links (/b/:boardId?token=…) open only while the link is enabled, unexpired and the token matches. */
export function SharedBoardPage() {
  const board = useBoardFromUrl()
  const [searchParams] = useSearchParams()
  const [openedAt] = useState(() => Date.now())
  if (!board) return <BoardNotFound />

  const { share } = board
  const expired = share.expiresAt !== null && share.expiresAt < openedAt
  if (!share.enabled || expired || searchParams.get('token') !== share.token) {
    return <MessagePage title="This link has expired" message="The share link was disabled, has expired or is incomplete. Ask the board owner for a new one." />
  }
  return <Editor board={board} />
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
