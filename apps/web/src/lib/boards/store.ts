import { newId } from '@/lib/board/elements'
import { parseBoardData, serializeBoard } from '@/lib/board/storage'
import type { BoardElement } from '@/lib/board/types'

/*
 * Boards live in this browser's localStorage until the sync server exists:
 * an index of board metadata plus one entry per board's elements.
 */

export type BoardType = 'whiteboard' | 'wireframe' | 'diagram'
export type ShareRole = 'view' | 'edit'

export type ShareSettings = {
  token: string
  enabled: boolean
  role: ShareRole
  /** Milliseconds since epoch, or null for a link that never expires. */
  expiresAt: number | null
  requireSignIn: boolean
  invites: { email: string; role: ShareRole }[]
}

export type BoardMeta = {
  id: string
  name: string
  type: BoardType
  createdAt: number
  updatedAt: number
  openedAt: number
  starred: boolean
  /** When the board was moved to the trash, or null. */
  trashedAt: number | null
  elementCount: number
  share: ShareSettings
}

const INDEX_KEY = 'sketchsync:boards'
const LEGACY_BOARD_KEY = 'sketchsync:board:untitled'
const contentKey = (id: string) => `sketchsync:board-content:${id}`

export const FREE_BOARD_LIMIT = 10

const listeners = new Set<() => void>()
let cache: BoardMeta[] | null = null

/** Unguessable share-link token: 128 random bits as hex. */
export function newShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function defaultShareSettings(): ShareSettings {
  return { token: newShareToken(), enabled: true, role: 'edit', expiresAt: Date.now() + 24 * 60 * 60 * 1000, requireSignIn: true, invites: [] }
}

function readIndex(): BoardMeta[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(boards: BoardMeta[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(boards))
  } catch {
    // Storage full or blocked: changes stay in memory for this session.
  }
  cache = boards
  listeners.forEach((listener) => listener())
}

/** Move the single board saved before multi-board support into the index. */
function migrateLegacyBoard(boards: BoardMeta[]) {
  const legacy = localStorage.getItem(LEGACY_BOARD_KEY)
  if (legacy === null) return boards
  localStorage.removeItem(LEGACY_BOARD_KEY)
  const elements = parseBoardData(JSON.parse(legacy)) ?? []
  if (elements.length === 0) return boards
  const meta = newMeta('Untitled Board', 'whiteboard', elements.length)
  localStorage.setItem(contentKey(meta.id), serializeBoard(elements))
  return [meta, ...boards]
}

export function listBoards(): BoardMeta[] {
  if (cache) return cache
  let boards = readIndex()
  try {
    const migrated = migrateLegacyBoard(boards)
    if (migrated !== boards) {
      boards = migrated
      localStorage.setItem(INDEX_KEY, JSON.stringify(boards))
    }
  } catch {
    // Ignore a corrupt legacy board.
  }
  cache = boards
  return boards
}

/**
 * The index as currently stored, for read-modify-write changes, so a change
 * made in another tab since this one last read it is never overwritten.
 */
function latestBoards() {
  cache = null
  return listBoards()
}

export function subscribeBoards(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== INDEX_KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getBoard(id: string) {
  return listBoards().find((board) => board.id === id)
}

function newMeta(name: string, type: BoardType, elementCount: number): BoardMeta {
  const now = Date.now()
  return { id: newId(), name, type, createdAt: now, updatedAt: now, openedAt: now, starred: false, trashedAt: null, elementCount, share: defaultShareSettings() }
}

export function createBoard({ name = 'Untitled Board', type = 'whiteboard', elements = [] }: { name?: string; type?: BoardType; elements?: BoardElement[] } = {}) {
  const meta = newMeta(name, type, elements.length)
  saveBoardElements(meta.id, elements, { touch: false })
  writeIndex([meta, ...latestBoards()])
  return meta
}

export function updateBoard(id: string, patch: Partial<Omit<BoardMeta, 'id'>>) {
  writeIndex(latestBoards().map((board) => (board.id === id ? { ...board, ...patch } : board)))
}

export function deleteBoardForever(id: string) {
  localStorage.removeItem(contentKey(id))
  writeIndex(latestBoards().filter((board) => board.id !== id))
}

export function loadBoardElements(id: string): BoardElement[] {
  try {
    const raw = localStorage.getItem(contentKey(id))
    return (raw && parseBoardData(JSON.parse(raw))) || []
  } catch {
    return []
  }
}

export function saveBoardElements(id: string, elements: BoardElement[], { touch = true } = {}) {
  try {
    localStorage.setItem(contentKey(id), serializeBoard(elements))
  } catch {
    // Storage full or blocked: the board still works, it just won't persist.
  }
  if (touch) updateBoard(id, { updatedAt: Date.now(), elementCount: elements.length })
}

export function duplicateBoard(id: string) {
  const original = getBoard(id)
  if (!original) return undefined
  return createBoard({ name: `${original.name} (copy)`, type: original.type, elements: loadBoardElements(id) })
}
