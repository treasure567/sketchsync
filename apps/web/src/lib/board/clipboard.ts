import { cloneElement, normalizeElements } from '@/lib/board/elements'
import { unionBounds } from '@/lib/board/geometry'
import type { BoardElement, Point } from '@/lib/board/types'

const CLIPBOARD_KEY = 'sketchsync:clipboard'

/** Copy elements so they can be pasted into any board in this browser. */
export function copyToClipboard(elements: BoardElement[]) {
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(elements))
  } catch {
    // Clipboard is best-effort.
  }
}

/** Fresh copies of the clipboard, centred on `at`. */
export function pasteFromClipboard(at: Point): BoardElement[] {
  let stored: unknown
  try {
    stored = JSON.parse(localStorage.getItem(CLIPBOARD_KEY) ?? '[]')
  } catch {
    return []
  }
  const elements = Array.isArray(stored) ? normalizeElements(stored) : []
  const bounds = unionBounds(elements)
  if (!bounds) return []
  const dx = at.x - (bounds.minX + bounds.maxX) / 2
  const dy = at.y - (bounds.minY + bounds.maxY) / 2
  return elements.map((element) => cloneElement(element, dx, dy))
}

export function hasClipboardContent() {
  return (localStorage.getItem(CLIPBOARD_KEY) ?? '[]') !== '[]'
}
