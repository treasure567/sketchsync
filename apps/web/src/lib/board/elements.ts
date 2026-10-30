import { normalizeBox } from '@/lib/board/geometry'
import type { BoardElement, FreedrawElement, LinearElement, Point, ShapeElement, ShapeKind, StickyElement } from '@/lib/board/types'

export const DEFAULT_FILL = '#d5d9e2'
export const DEFAULT_STROKE = '#1f2433'

const DEFAULT_SHAPE_SIZE = { width: 140, height: 100 }
const DEFAULT_LINE_LENGTH = 140
export const STICKY_SIZE = { width: 200, height: 160 }

/** Below this size (world units) a drag counts as a click. */
const MIN_DRAG = 4

function newId() {
  return crypto.randomUUID()
}

export function createShape(type: ShapeKind, at: Point): ShapeElement {
  return { id: newId(), type, x: at.x, y: at.y, width: 0, height: 0, fill: DEFAULT_FILL, stroke: 'transparent', strokeWidth: 2 }
}

export function createLinear(type: 'line' | 'arrow', at: Point): LinearElement {
  return { id: newId(), type, points: [at, at], stroke: DEFAULT_STROKE, strokeWidth: 2 }
}

export function createFreedraw(at: Point): FreedrawElement {
  return { id: newId(), type: 'freedraw', points: [at], stroke: DEFAULT_STROKE, strokeWidth: 2.5 }
}

/** A sticky note centred on `center`. */
export function createSticky(center: Point): StickyElement {
  return { id: newId(), type: 'sticky', x: center.x - STICKY_SIZE.width / 2, y: center.y - STICKY_SIZE.height / 2, ...STICKY_SIZE, text: '' }
}

/**
 * Tidy an element once the user lets go: normalise negative sizes, and give
 * a default size to shapes and lines created with a click rather than a drag.
 */
export function finalizeCreated(element: BoardElement): BoardElement {
  switch (element.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      if (Math.abs(element.width) < MIN_DRAG && Math.abs(element.height) < MIN_DRAG) {
        return { ...element, x: element.x - DEFAULT_SHAPE_SIZE.width / 2, y: element.y - DEFAULT_SHAPE_SIZE.height / 2, ...DEFAULT_SHAPE_SIZE }
      }
      return { ...element, ...normalizeBox(element) }
    }
    case 'line':
    case 'arrow': {
      const [start, end] = element.points
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN_DRAG) {
        return { ...element, points: [start, { x: start.x + DEFAULT_LINE_LENGTH, y: start.y }] }
      }
      return element
    }
    default:
      return element
  }
}

/** Resize a shape being drawn from `origin` to `current`; `square` keeps equal sides. */
export function resizeFromOrigin(element: ShapeElement, origin: Point, current: Point, square: boolean): ShapeElement {
  let width = current.x - origin.x
  let height = current.y - origin.y
  if (square) {
    const size = Math.max(Math.abs(width), Math.abs(height))
    width = Math.sign(width || 1) * size
    height = Math.sign(height || 1) * size
  }
  return { ...element, x: origin.x, y: origin.y, width, height }
}

const elementTypes = new Set(['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'freedraw', 'sticky'])

/** Loose check for elements read from storage or a file. */
export function isBoardElement(value: unknown): value is BoardElement {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { id?: unknown; type?: unknown }
  return typeof candidate.id === 'string' && typeof candidate.type === 'string' && elementTypes.has(candidate.type)
}
