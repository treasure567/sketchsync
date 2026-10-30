import { cloneElement } from '@/lib/board/elements'
import type { BoardElement, ElementStyle } from '@/lib/board/types'

type Ids = ReadonlySet<string>

export function deleteElements(elements: BoardElement[], ids: Ids) {
  return elements.filter((element) => !ids.has(element.id))
}

/** Copies of the selected elements, placed just after the originals. */
export function duplicateElements(elements: BoardElement[], ids: Ids, offset = 16) {
  const copies = elements.filter((element) => ids.has(element.id)).map((element) => cloneElement(element, offset, offset))
  return { elements: [...elements, ...copies], copyIds: new Set(copies.map((copy) => copy.id)) }
}

export function setLocked(elements: BoardElement[], ids: Ids, locked: boolean) {
  return elements.map((element) => (ids.has(element.id) ? { ...element, locked } : element))
}

export function applyStyle(elements: BoardElement[], ids: Ids, patch: Partial<ElementStyle>) {
  return elements.map((element) => (ids.has(element.id) ? { ...element, style: { ...element.style, ...patch } } : element))
}

export type LayerMove = 'front' | 'forward' | 'backward' | 'back'

/** Change drawing order: later elements are drawn on top. */
export function reorder(elements: BoardElement[], ids: Ids, move: LayerMove) {
  if (move === 'front' || move === 'back') {
    const picked = elements.filter((element) => ids.has(element.id))
    const rest = elements.filter((element) => !ids.has(element.id))
    return move === 'front' ? [...rest, ...picked] : [...picked, ...rest]
  }
  const result = [...elements]
  if (move === 'forward') {
    for (let i = result.length - 2; i >= 0; i--) {
      if (ids.has(result[i].id) && !ids.has(result[i + 1].id)) [result[i], result[i + 1]] = [result[i + 1], result[i]]
    }
  } else {
    for (let i = 1; i < result.length; i++) {
      if (ids.has(result[i].id) && !ids.has(result[i - 1].id)) [result[i], result[i - 1]] = [result[i - 1], result[i]]
    }
  }
  return result
}
