import type { BoardElement, Bounds, Camera, Point } from '@/lib/board/types'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function screenToWorld(point: Point, camera: Camera): Point {
  return { x: point.x / camera.zoom + camera.x, y: point.y / camera.zoom + camera.y }
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return { x: (point.x - camera.x) * camera.zoom, y: (point.y - camera.y) * camera.zoom }
}

/** Zoom to `zoom` while keeping the world point under `screenPoint` fixed. */
export function zoomAt(camera: Camera, screenPoint: Point, zoom: number): Camera {
  const nextZoom = clampZoom(zoom)
  const anchor = screenToWorld(screenPoint, camera)
  return { x: anchor.x - screenPoint.x / nextZoom, y: anchor.y - screenPoint.y / nextZoom, zoom: nextZoom }
}

/** The world rectangle covered by a viewport of the given size. */
export function viewportBounds(camera: Camera, width: number, height: number): Bounds {
  return { minX: camera.x, minY: camera.y, maxX: camera.x + width / camera.zoom, maxY: camera.y + height / camera.zoom }
}

/** A camera that fits `bounds` inside a viewport, with `padding` screen pixels around it. */
export function cameraToFit(bounds: Bounds, width: number, height: number, padding = 40, maxZoom = 1): Camera {
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1)
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1)
  const zoom = clampZoom(Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight, maxZoom))
  return {
    x: bounds.minX - (width / zoom - contentWidth) / 2,
    y: bounds.minY - (height / zoom - contentHeight) / 2,
    zoom,
  }
}

/** x/y/width/height with width and height made positive. */
export function normalizeBox(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  }
}

export function pointsBounds(points: Point[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { x, y } of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

export function getBounds(element: BoardElement): Bounds {
  switch (element.type) {
    case 'line':
    case 'arrow':
    case 'freedraw':
      return pointsBounds(element.points)
    default: {
      const { x, y, width, height } = normalizeBox(element)
      return { minX: x, minY: y, maxX: x + width, maxY: y + height }
    }
  }
}

/** Smallest bounds containing every element, or null for none. */
export function unionBounds(elements: BoardElement[]): Bounds | null {
  if (elements.length === 0) return null
  return elements.map(getBounds).reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }))
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

export function boundsContain(outer: Bounds, inner: Bounds) {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY
}

export function boundsFromPoints(a: Point, b: Point): Bounds {
  return pointsBounds([a, b])
}

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function distanceToPolyline(p: Point, points: Point[]) {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y)
  let min = Infinity
  for (let i = 1; i < points.length; i++) min = Math.min(min, distanceToSegment(p, points[i - 1], points[i]))
  return min
}

/** Whether `point` lies inside a shape grown (or shrunk, if negative) by `pad`. */
function insideShape(element: BoardElement & { x: number; y: number; width: number; height: number }, point: Point, pad: number) {
  const { x, y, width, height } = normalizeBox(element)
  const rx = width / 2 + pad
  const ry = height / 2 + pad
  if (rx <= 0 || ry <= 0) return false
  const dx = Math.abs(point.x - (x + width / 2))
  const dy = Math.abs(point.y - (y + height / 2))
  if (element.type === 'ellipse') return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
  if (element.type === 'diamond') return dx / rx + dy / ry <= 1
  return dx <= rx && dy <= ry
}

/**
 * Whether `point` touches the element. Filled shapes count their inside;
 * unfilled ones only their outline. `tolerance` is in world units.
 */
export function hitTest(element: BoardElement, point: Point, tolerance: number) {
  switch (element.type) {
    case 'line':
    case 'arrow':
    case 'freedraw':
      return distanceToPolyline(point, element.points) <= tolerance + element.style.strokeWidth / 2
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      const edge = tolerance + element.style.strokeWidth / 2
      if (!insideShape(element, point, edge)) return false
      const filled = element.style.fill !== 'transparent'
      return filled || !insideShape(element, point, -edge)
    }
    default:
      return insideShape(element, point, tolerance)
  }
}

/** The element drawn on top at `point`, if any. */
export function hitTopmost(elements: BoardElement[], point: Point, tolerance: number) {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTest(elements[i], point, tolerance)) return elements[i]
  }
  return undefined
}

export function translate(element: BoardElement, dx: number, dy: number): BoardElement {
  switch (element.type) {
    case 'line':
    case 'arrow':
      return { ...element, points: [{ x: element.points[0].x + dx, y: element.points[0].y + dy }, { x: element.points[1].x + dx, y: element.points[1].y + dy }] }
    case 'freedraw':
      return { ...element, points: element.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) }
    default:
      return { ...element, x: element.x + dx, y: element.y + dy }
  }
}

/** Map an element from one bounding box to another, scaling its geometry. */
export function scaleElement(element: BoardElement, from: Bounds, to: Bounds): BoardElement {
  const sx = (to.maxX - to.minX) / Math.max(from.maxX - from.minX, 1e-6)
  const sy = (to.maxY - to.minY) / Math.max(from.maxY - from.minY, 1e-6)
  const map = (p: Point) => ({ x: to.minX + (p.x - from.minX) * sx, y: to.minY + (p.y - from.minY) * sy })

  switch (element.type) {
    case 'line':
    case 'arrow':
      return { ...element, points: [map(element.points[0]), map(element.points[1])] }
    case 'freedraw':
      return { ...element, points: element.points.map((p) => ({ ...p, ...map(p) })) }
    default: {
      const box = normalizeBox(element)
      const topLeft = map({ x: box.x, y: box.y })
      const size = { ...topLeft, width: box.width * sx, height: box.height * sy }
      if (element.type === 'text') return { ...element, ...size, fontSize: Math.max(4, element.fontSize * sy) }
      return { ...element, ...size }
    }
  }
}

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** Resize handle positions around `bounds` (world units). */
export function handlePositions(bounds: Bounds, padding: number): { id: HandleId; x: number; y: number }[] {
  const minX = bounds.minX - padding
  const minY = bounds.minY - padding
  const maxX = bounds.maxX + padding
  const maxY = bounds.maxY + padding
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  return [
    { id: 'nw', x: minX, y: minY },
    { id: 'n', x: midX, y: minY },
    { id: 'ne', x: maxX, y: minY },
    { id: 'e', x: maxX, y: midY },
    { id: 'se', x: maxX, y: maxY },
    { id: 's', x: midX, y: maxY },
    { id: 'sw', x: minX, y: maxY },
    { id: 'w', x: minX, y: midY },
  ]
}

/** New bounds after dragging `handle` to `point`; `keepRatio` preserves the aspect ratio. */
export function resizeBounds(bounds: Bounds, handle: HandleId, point: Point, keepRatio: boolean): Bounds {
  let { minX, minY, maxX, maxY } = bounds
  if (handle.includes('w')) minX = Math.min(point.x, maxX - 1)
  if (handle.includes('e')) maxX = Math.max(point.x, minX + 1)
  if (handle.includes('n')) minY = Math.min(point.y, maxY - 1)
  if (handle.includes('s')) maxY = Math.max(point.y, minY + 1)

  if (keepRatio && handle.length === 2) {
    const ratio = (bounds.maxX - bounds.minX) / Math.max(bounds.maxY - bounds.minY, 1e-6)
    const width = maxX - minX
    const height = maxY - minY
    if (width / ratio > height) {
      const target = width / ratio
      if (handle.includes('n')) minY = maxY - target
      else maxY = minY + target
    } else {
      const target = height * ratio
      if (handle.includes('w')) minX = maxX - target
      else maxX = minX + target
    }
  }
  return { minX, minY, maxX, maxY }
}

export const handleCursors: Record<HandleId, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}
