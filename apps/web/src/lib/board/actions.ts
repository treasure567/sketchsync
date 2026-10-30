import { updateBindings } from '@/lib/board/bindings'
import { cloneElements, newId } from '@/lib/board/elements'
import { getBounds, translate, unionBounds } from '@/lib/board/geometry'
import type { BoardElement, ElementStyle } from '@/lib/board/types'

type Ids = ReadonlySet<string>

export function deleteElements(elements: BoardElement[], ids: Ids) {
  return updateBindings(elements.filter((element) => !ids.has(element.id)))
}

/** Copies of the selected elements, placed just after the originals. */
export function duplicateElements(elements: BoardElement[], ids: Ids, offset = 16) {
  const copies = cloneElements(
    elements.filter((element) => ids.has(element.id)),
    offset,
    offset,
  )
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

/** The ids plus every element grouped with them. */
export function expandGroups(elements: BoardElement[], ids: Ids): Set<string> {
  const groups = new Set(elements.filter((element) => ids.has(element.id) && element.groupId).map((element) => element.groupId))
  return new Set(elements.filter((element) => ids.has(element.id) || (element.groupId && groups.has(element.groupId))).map((element) => element.id))
}

export function groupElements(elements: BoardElement[], ids: Ids) {
  const groupId = newId()
  return elements.map((element) => (ids.has(element.id) ? { ...element, groupId } : element))
}

export function ungroupElements(elements: BoardElement[], ids: Ids) {
  return elements.map((element) => {
    if (!ids.has(element.id) || !element.groupId) return element
    const { groupId: _groupId, ...rest } = element
    return rest as BoardElement
  })
}

/** Selected elements bundled so a group moves as one unit. */
function units(elements: BoardElement[], ids: Ids) {
  const byKey = new Map<string, BoardElement[]>()
  for (const element of elements) {
    if (!ids.has(element.id)) continue
    const key = element.groupId ?? element.id
    byKey.set(key, [...(byKey.get(key) ?? []), element])
  }
  return [...byKey.values()].map((members) => ({ ids: new Set(members.map((member) => member.id)), bounds: unionBounds(members)! }))
}

function moveUnits(elements: BoardElement[], offsets: { ids: Set<string>; dx: number; dy: number }[]) {
  const moved = elements.map((element) => {
    const offset = offsets.find((entry) => entry.ids.has(element.id))
    return offset && (offset.dx || offset.dy) ? translate(element, offset.dx, offset.dy) : element
  })
  return updateBindings(moved)
}

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** Line up the selected elements (or groups) along one edge or centre of their combined bounds. */
export function alignElements(elements: BoardElement[], ids: Ids, alignment: Alignment) {
  const parts = units(elements, ids)
  const all = unionBounds(elements.filter((element) => ids.has(element.id)))
  if (parts.length < 2 || !all) return elements
  return moveUnits(
    elements,
    parts.map(({ ids: unitIds, bounds }) => {
      const width = bounds.maxX - bounds.minX
      const height = bounds.maxY - bounds.minY
      const x = { left: all.minX, center: (all.minX + all.maxX - width) / 2, right: all.maxX - width }
      const y = { top: all.minY, middle: (all.minY + all.maxY - height) / 2, bottom: all.maxY - height }
      const horizontal = alignment === 'left' || alignment === 'center' || alignment === 'right'
      return {
        ids: unitIds,
        dx: horizontal ? x[alignment as keyof typeof x] - bounds.minX : 0,
        dy: horizontal ? 0 : y[alignment as keyof typeof y] - bounds.minY,
      }
    }),
  )
}

/** Space the selected elements (or groups) evenly between the outermost ones. */
export function distributeElements(elements: BoardElement[], ids: Ids, axis: 'horizontal' | 'vertical') {
  const parts = units(elements, ids)
  if (parts.length < 3) return elements
  const min = axis === 'horizontal' ? 'minX' : 'minY'
  const max = axis === 'horizontal' ? 'maxX' : 'maxY'
  parts.sort((a, b) => a.bounds[min] - b.bounds[min])
  const span = parts[parts.length - 1].bounds[max] - parts[0].bounds[min]
  const sizes = parts.reduce((sum, part) => sum + part.bounds[max] - part.bounds[min], 0)
  const gap = (span - sizes) / (parts.length - 1)
  let cursor = parts[0].bounds[min]
  return moveUnits(
    elements,
    parts.map(({ ids: unitIds, bounds }) => {
      const delta = cursor - bounds[min]
      cursor += bounds[max] - bounds[min] + gap
      return { ids: unitIds, dx: axis === 'horizontal' ? delta : 0, dy: axis === 'vertical' ? delta : 0 }
    }),
  )
}

/** Move elements by (dx, dy), e.g. for arrow-key nudging. Locked elements stay put. */
export function nudgeElements(elements: BoardElement[], ids: Ids, dx: number, dy: number) {
  return updateBindings(elements.map((element) => (ids.has(element.id) && !element.locked ? translate(element, dx, dy) : element)))
}

/** A short, screen-reader friendly description of an element. */
export function describeElement(element: BoardElement) {
  const { minX, minY, maxX, maxY } = getBounds(element)
  const size = `${Math.round(maxX - minX)} by ${Math.round(maxY - minY)}`
  const at = `at ${Math.round(minX)}, ${Math.round(minY)}`
  switch (element.type) {
    case 'text':
      return `Text “${element.text.slice(0, 80)}” ${at}`
    case 'sticky':
      return `Sticky note “${element.text.slice(0, 80) || 'empty'}” ${at}`
    case 'line':
    case 'arrow':
      return `${element.type === 'arrow' ? 'Arrow' : 'Line'} from ${Math.round(element.points[0].x)}, ${Math.round(element.points[0].y)} to ${Math.round(element.points[1].x)}, ${Math.round(element.points[1].y)}${element.startBinding || element.endBinding ? ', connected' : ''}`
    case 'freedraw':
      return `Drawing, ${size}, ${at}`
    case 'image':
      return `Image, ${size}, ${at}`
    default:
      return `${element.type[0].toUpperCase()}${element.type.slice(1)}, ${size}, ${at}`
  }
}
