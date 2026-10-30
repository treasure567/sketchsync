import { isBoardElement } from '@/lib/board/elements'
import type { BoardElement } from '@/lib/board/types'

const STORAGE_KEY = 'sketchsync:board:untitled'
const FORMAT = 'sketchsync'

type BoardFile = { type: typeof FORMAT; version: 1; elements: BoardElement[] }

function parseElements(data: unknown): BoardElement[] | null {
  if (typeof data !== 'object' || data === null) return null
  const elements = (data as { elements?: unknown }).elements
  return Array.isArray(elements) ? elements.filter(isBoardElement) : null
}

/** The board saved in this browser, or an empty board. */
export function loadLocalBoard(): BoardElement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return (raw && parseElements(JSON.parse(raw))) || []
  } catch {
    return []
  }
}

export function saveLocalBoard(elements: BoardElement[]) {
  const file: BoardFile = { type: FORMAT, version: 1, elements }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
  } catch {
    // Storage full or blocked (e.g. private mode): the board still works, it just won't persist.
  }
}

/** Read a diagram file chosen by the user. */
export async function readBoardFile(file: File): Promise<BoardElement[]> {
  const elements = parseElements(JSON.parse(await file.text()))
  if (!elements) throw new Error('This file is not a SketchSync diagram.')
  return elements
}
