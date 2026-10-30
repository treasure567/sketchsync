import { normalizeElements } from '@/lib/board/elements'
import type { BoardElement } from '@/lib/board/types'

const FORMAT = 'sketchsync'

type BoardFile = { type: typeof FORMAT; version: 1; elements: BoardElement[] }

/** Elements from saved board data, or null if it is not a board. */
export function parseBoardData(data: unknown): BoardElement[] | null {
  if (typeof data !== 'object' || data === null) return null
  const elements = (data as { elements?: unknown }).elements
  return Array.isArray(elements) ? normalizeElements(elements) : null
}

export function serializeBoard(elements: BoardElement[]) {
  const file: BoardFile = { type: FORMAT, version: 1, elements }
  return JSON.stringify(file)
}

/** Read a diagram file chosen by the user. */
export async function readBoardFile(file: File): Promise<BoardElement[]> {
  const elements = parseBoardData(JSON.parse(await file.text()))
  if (!elements) throw new Error('This file is not a SketchSync diagram.')
  return elements
}
