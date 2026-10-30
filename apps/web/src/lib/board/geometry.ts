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

/** x/y/width/height with width and height made positive. */
export function normalizeBox(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  }
}

function pointsBounds(points: Point[]): Bounds {
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

/** Whether `point` touches the element. Filled shapes count their inside; `tolerance` is in world units. */
export function hitTest(element: BoardElement, point: Point, tolerance: number) {
  switch (element.type) {
    case 'line':
    case 'arrow':
    case 'freedraw':
      return distanceToPolyline(point, element.points) <= tolerance + element.strokeWidth / 2
    case 'ellipse': {
      const { x, y, width, height } = normalizeBox(element)
      const rx = width / 2 + tolerance
      const ry = height / 2 + tolerance
      const dx = point.x - (x + width / 2)
      const dy = point.y - (y + height / 2)
      return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
    }
    case 'diamond': {
      const { x, y, width, height } = normalizeBox(element)
      const dx = Math.abs(point.x - (x + width / 2))
      const dy = Math.abs(point.y - (y + height / 2))
      return dx / (width / 2 + tolerance) + dy / (height / 2 + tolerance) <= 1
    }
    default: {
      const { minX, minY, maxX, maxY } = getBounds(element)
      return point.x >= minX - tolerance && point.x <= maxX + tolerance && point.y >= minY - tolerance && point.y <= maxY + tolerance
    }
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
      return { ...element, points: element.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    default:
      return { ...element, x: element.x + dx, y: element.y + dy }
  }
}
