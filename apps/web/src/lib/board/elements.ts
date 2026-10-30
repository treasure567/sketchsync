import { normalizeBox } from '@/lib/board/geometry'
import { measureText } from '@/lib/board/text'
import type {
  BoardElement,
  ElementStyle,
  FreedrawElement,
  LinearElement,
  Point,
  ShapeElement,
  ShapeKind,
  StickyElement,
  StrokePoint,
  TextElement,
} from '@/lib/board/types'

export const DEFAULT_STYLE: ElementStyle = {
  stroke: '#1f2433',
  fill: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  opacity: 100,
  rounded: true,
  pressure: true,
}

export const STICKY_FILL = '#fdf1c4'
export const STICKY_SIZE = { width: 200, height: 160 }
export const DEFAULT_FONT_SIZE = 20

const DEFAULT_SHAPE_SIZE = { width: 140, height: 100 }
const DEFAULT_LINE_LENGTH = 140

/** Below this size (world units) a drag counts as a click. */
const MIN_DRAG = 4

export function newId() {
  return crypto.randomUUID()
}

export function createShape(type: ShapeKind, at: Point, style: ElementStyle): ShapeElement {
  return { id: newId(), type, style, x: at.x, y: at.y, width: 0, height: 0 }
}

export function createLinear(type: 'line' | 'arrow', at: Point, style: ElementStyle): LinearElement {
  return { id: newId(), type, style, points: [at, at] }
}

export function createFreedraw(at: StrokePoint, style: ElementStyle): FreedrawElement {
  return { id: newId(), type: 'freedraw', style, points: [at] }
}

/** A sticky note centred on `center`. Uses the style's background, or classic yellow. */
export function createSticky(center: Point, style: ElementStyle): StickyElement {
  const fill = style.fill === 'transparent' ? STICKY_FILL : style.fill
  return {
    id: newId(),
    type: 'sticky',
    style: { ...style, fill },
    x: center.x - STICKY_SIZE.width / 2,
    y: center.y - STICKY_SIZE.height / 2,
    ...STICKY_SIZE,
    text: '',
  }
}

export function createText(at: Point, style: ElementStyle, text = '', fontSize = DEFAULT_FONT_SIZE): TextElement {
  return { id: newId(), type: 'text', style, x: at.x, y: at.y, ...measureText(text || ' ', fontSize), text, fontSize }
}

/** Set a text element's text and resize it to fit. */
export function withText(element: TextElement, text: string): TextElement {
  return { ...element, text, ...measureText(text || ' ', element.fontSize) }
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

/** A copy with a new id, moved by (dx, dy). */
export function cloneElement(element: BoardElement, dx = 0, dy = 0): BoardElement {
  const copy = structuredClone(element)
  copy.id = newId()
  delete copy.locked
  switch (copy.type) {
    case 'line':
    case 'arrow':
      copy.points = [
        { x: copy.points[0].x + dx, y: copy.points[0].y + dy },
        { x: copy.points[1].x + dx, y: copy.points[1].y + dy },
      ]
      return copy
    case 'freedraw':
      copy.points = copy.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
      return copy
    default:
      copy.x += dx
      copy.y += dy
      return copy
  }
}

const elementTypes = new Set(['rectangle', 'diamond', 'ellipse', 'line', 'arrow', 'freedraw', 'sticky', 'text'])

/**
 * Turn stored data into an element, or null if it is not one. Boards saved
 * before styles existed kept fill/stroke/strokeWidth at the top level.
 */
export function normalizeElement(value: unknown): BoardElement | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || typeof raw.type !== 'string' || !elementTypes.has(raw.type)) return null
  if (typeof raw.style === 'object' && raw.style !== null) return { ...raw, style: { ...DEFAULT_STYLE, ...raw.style } } as BoardElement

  const { fill, stroke, strokeWidth, ...rest } = raw
  const style: ElementStyle = {
    ...DEFAULT_STYLE,
    ...(typeof stroke === 'string' && { stroke }),
    ...(typeof fill === 'string' && { fill }),
    ...(typeof strokeWidth === 'number' && { strokeWidth }),
  }
  if (raw.type === 'sticky') style.fill = STICKY_FILL
  return { ...rest, style } as BoardElement
}

export function normalizeElements(values: unknown[]): BoardElement[] {
  return values.map(normalizeElement).filter((element): element is BoardElement => element !== null)
}
