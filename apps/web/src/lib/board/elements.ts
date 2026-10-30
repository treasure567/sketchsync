import { normalizeBox } from '@/lib/board/geometry'
import { measureText } from '@/lib/board/text'
import type {
  BoardElement,
  ElementStyle,
  FreedrawElement,
  ImageElement,
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

/** An image centred on `center`, at its natural size (already downscaled). */
export function createImage(center: Point, src: string, width: number, height: number): ImageElement {
  return { id: newId(), type: 'image', style: DEFAULT_STYLE, x: center.x - width / 2, y: center.y - height / 2, width, height, src }
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
  delete copy.groupId
  if (copy.type === 'line' || copy.type === 'arrow') {
    delete copy.startBinding
    delete copy.endBinding
  }
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

/**
 * Copies of a set of elements with new ids, moved by (dx, dy). Groups and
 * connector attachments within the set are kept (with new ids); links to
 * elements outside the set are dropped.
 */
export function cloneElements(elements: BoardElement[], dx = 0, dy = 0): BoardElement[] {
  const copies = elements.map((element) => cloneElement(element, dx, dy))
  const ids = new Map(elements.map((element, index) => [element.id, copies[index].id]))
  const groups = new Map<string, string>()
  return copies.map((copy, index) => {
    const original = elements[index]
    let next = copy
    if (original.groupId) {
      if (!groups.has(original.groupId)) groups.set(original.groupId, newId())
      next = { ...next, groupId: groups.get(original.groupId) }
    }
    if ((original.type === 'line' || original.type === 'arrow') && (next.type === 'line' || next.type === 'arrow')) {
      const startBinding = original.startBinding && ids.get(original.startBinding)
      const endBinding = original.endBinding && ids.get(original.endBinding)
      next = { ...next, ...(startBinding && { startBinding }), ...(endBinding && { endBinding }) }
    }
    return next
  })
}

// ---------- Validation ----------
// Elements also come from files and storage, so every field is checked and
// rebuilt rather than trusted: a malformed or hostile file must not crash the
// board or smuggle markup into exports.

const MAX_TEXT_LENGTH = 10_000
const MAX_POINTS = 20_000
const COLOR = /^(transparent|#[0-9a-f]{3,8})$/i
const IMAGE_SRC = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i
const MAX_IMAGE_SRC_LENGTH = 4_000_000

type Raw = Record<string, unknown>

const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T) => (options.includes(value as T) ? (value as T) : fallback)
const color = (value: unknown, fallback: string) => (typeof value === 'string' && COLOR.test(value) ? value : fallback)
const cleanId = (value: unknown) => (typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : undefined)
const cleanText = (value: unknown) => (typeof value === 'string' ? value.slice(0, MAX_TEXT_LENGTH) : '')

function cleanStyle(raw: Raw): ElementStyle {
  return {
    stroke: color(raw.stroke, DEFAULT_STYLE.stroke),
    fill: color(raw.fill, DEFAULT_STYLE.fill),
    fillStyle: oneOf(raw.fillStyle, ['solid', 'hatch', 'cross'] as const, DEFAULT_STYLE.fillStyle),
    strokeWidth: isNumber(raw.strokeWidth) ? clamp(raw.strokeWidth, 0.5, 40) : DEFAULT_STYLE.strokeWidth,
    strokeStyle: oneOf(raw.strokeStyle, ['solid', 'dashed', 'dotted'] as const, DEFAULT_STYLE.strokeStyle),
    opacity: isNumber(raw.opacity) ? clamp(raw.opacity, 0, 100) : DEFAULT_STYLE.opacity,
    rounded: typeof raw.rounded === 'boolean' ? raw.rounded : DEFAULT_STYLE.rounded,
    pressure: typeof raw.pressure === 'boolean' ? raw.pressure : DEFAULT_STYLE.pressure,
  }
}

function cleanPoint(value: unknown): StrokePoint | null {
  if (!isRecord(value) || !isNumber(value.x) || !isNumber(value.y)) return null
  return isNumber(value.p) ? { x: value.x, y: value.y, p: clamp(value.p, 0, 1) } : { x: value.x, y: value.y }
}

function cleanBox(raw: Raw) {
  const { x, y, width, height } = raw
  if (!isNumber(x) || !isNumber(y) || !isNumber(width) || !isNumber(height)) return null
  return { x, y, width, height }
}

/**
 * Turn stored data into a valid element, or null if it is not one. Boards
 * saved before styles existed kept fill/stroke/strokeWidth at the top level.
 */
export function normalizeElement(value: unknown): BoardElement | null {
  if (!isRecord(value)) return null
  const { id, type } = value
  if (typeof id !== 'string' || id.length === 0 || id.length > 100) return null

  const legacy = !isRecord(value.style)
  const style = cleanStyle(legacy ? value : (value.style as Raw))
  const groupId = cleanId(value.groupId)
  const base = { id, style, ...(value.locked === true && { locked: true }), ...(groupId && { groupId }) }

  switch (type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      const box = cleanBox(value)
      return box && { ...base, type, ...box }
    }
    case 'line':
    case 'arrow': {
      const points = Array.isArray(value.points) ? value.points.map(cleanPoint) : []
      const [start, end] = points
      if (points.length !== 2 || !start || !end) return null
      const startBinding = cleanId(value.startBinding)
      const endBinding = cleanId(value.endBinding)
      return {
        ...base,
        type,
        points: [{ x: start.x, y: start.y }, { x: end.x, y: end.y }],
        ...(startBinding && { startBinding }),
        ...(endBinding && { endBinding }),
      }
    }
    case 'freedraw': {
      const points = Array.isArray(value.points) ? value.points.slice(0, MAX_POINTS).map(cleanPoint) : []
      const valid = points.filter((point): point is StrokePoint => point !== null)
      return valid.length > 0 ? { ...base, type, points: valid } : null
    }
    case 'sticky': {
      const box = cleanBox(value)
      if (!box) return null
      return { ...base, style: legacy ? { ...style, fill: STICKY_FILL } : style, type, ...box, text: cleanText(value.text) }
    }
    case 'text': {
      const box = cleanBox(value)
      if (!box) return null
      return { ...base, type, ...box, text: cleanText(value.text), fontSize: isNumber(value.fontSize) ? clamp(value.fontSize, 4, 400) : DEFAULT_FONT_SIZE }
    }
    case 'image': {
      const box = cleanBox(value)
      const src = value.src
      if (!box || typeof src !== 'string' || src.length > MAX_IMAGE_SRC_LENGTH || !IMAGE_SRC.test(src)) return null
      return { ...base, type, ...box, src }
    }
    default:
      return null
  }
}

export function normalizeElements(values: unknown[]): BoardElement[] {
  return values.map(normalizeElement).filter((element): element is BoardElement => element !== null)
}
