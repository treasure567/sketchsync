import { getBounds, normalizeBox } from '@/lib/board/geometry'
import type { BoardElement, LinearElement, Point } from '@/lib/board/types'

/*
 * Connectors: a line or arrow end can be attached ("bound") to a shape. A
 * bound end sits on the shape's outline, facing the other end, and follows the
 * shape when it moves or resizes.
 */

/** Space between a shape's outline and an attached arrow end (world units). */
const GAP = 6

type Bindable = Extract<BoardElement, { x: number }>

export function isBindable(element: BoardElement): element is Bindable {
  return element.type !== 'line' && element.type !== 'arrow' && element.type !== 'freedraw'
}

/** The topmost shape a connector end at `point` should attach to, if any. */
export function findBindTarget(elements: BoardElement[], point: Point, excludeId: string, tolerance: number) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i]
    if (element.id === excludeId || !isBindable(element)) continue
    const { minX, minY, maxX, maxY } = getBounds(element)
    if (point.x >= minX - tolerance && point.x <= maxX + tolerance && point.y >= minY - tolerance && point.y <= maxY + tolerance) return element
  }
  return undefined
}

function center(element: Bindable): Point {
  const { x, y, width, height } = normalizeBox(element)
  return { x: x + width / 2, y: y + height / 2 }
}

/** Point just outside `shape`'s outline, in the direction of `toward`. */
function outlinePoint(shape: Bindable, toward: Point): Point {
  const c = center(shape)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  if (dx === 0 && dy === 0) return c
  const { width, height } = normalizeBox(shape)
  const a = width / 2 + GAP
  const b = height / 2 + GAP
  let t: number
  if (shape.type === 'ellipse') t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b))
  else if (shape.type === 'diamond') t = 1 / (Math.abs(dx) / a + Math.abs(dy) / b)
  else t = Math.min(dx === 0 ? Infinity : a / Math.abs(dx), dy === 0 ? Infinity : b / Math.abs(dy))
  return { x: c.x + dx * t, y: c.y + dy * t }
}

function withoutBindings(element: LinearElement, keepStart: boolean, keepEnd: boolean): LinearElement {
  const { startBinding, endBinding, ...rest } = element
  return { ...rest, ...(keepStart && startBinding && { startBinding }), ...(keepEnd && endBinding && { endBinding }) }
}

/**
 * Re-route every connector to the shapes it is attached to, and drop
 * attachments to shapes that no longer exist. Returns the same array when
 * nothing changed, so history and saving are not disturbed.
 */
export function updateBindings(elements: BoardElement[]): BoardElement[] {
  if (!elements.some((element) => (element.type === 'line' || element.type === 'arrow') && (element.startBinding || element.endBinding))) return elements
  const byId = new Map(elements.map((element) => [element.id, element]))
  let changed = false

  const result = elements.map((element) => {
    if ((element.type !== 'line' && element.type !== 'arrow') || (!element.startBinding && !element.endBinding)) return element
    const start = element.startBinding ? byId.get(element.startBinding) : undefined
    const end = element.endBinding ? byId.get(element.endBinding) : undefined
    const startShape = start && isBindable(start) ? start : undefined
    const endShape = end && isBindable(end) ? end : undefined

    const startAnchor = startShape ? center(startShape) : element.points[0]
    const endAnchor = endShape ? center(endShape) : element.points[1]
    const p0 = startShape ? outlinePoint(startShape, endAnchor) : element.points[0]
    const p1 = endShape ? outlinePoint(endShape, startAnchor) : element.points[1]

    const lostBinding = (element.startBinding && !startShape) || (element.endBinding && !endShape)
    const moved = p0.x !== element.points[0].x || p0.y !== element.points[0].y || p1.x !== element.points[1].x || p1.y !== element.points[1].y
    if (!lostBinding && !moved) return element
    changed = true
    return { ...withoutBindings(element, !!startShape, !!endShape), points: [p0, p1] as [Point, Point] }
  })

  return changed ? result : elements
}

/** Attach a freshly drawn connector's ends to the shapes they were released over. */
export function bindNewConnector(elements: BoardElement[], connectorId: string, tolerance: number): BoardElement[] {
  const connector = elements.find((element) => element.id === connectorId)
  if (!connector || (connector.type !== 'line' && connector.type !== 'arrow')) return elements
  const start = findBindTarget(elements, connector.points[0], connector.id, tolerance)
  const end = findBindTarget(elements, connector.points[1], connector.id, tolerance)
  if (!start && !end) return elements
  const bound: LinearElement = { ...connector, ...(start && { startBinding: start.id }), ...(end && end.id !== start?.id && { endBinding: end.id }) }
  return updateBindings(elements.map((element) => (element.id === connectorId ? bound : element)))
}

/** Detach connector ends whose shapes are not moving along with the connector. */
export function detachFromStaticShapes(element: LinearElement, moving: ReadonlySet<string>): LinearElement {
  const keepStart = !!element.startBinding && moving.has(element.startBinding)
  const keepEnd = !!element.endBinding && moving.has(element.endBinding)
  return keepStart === !!element.startBinding && keepEnd === !!element.endBinding ? element : withoutBindings(element, keepStart, keepEnd)
}
