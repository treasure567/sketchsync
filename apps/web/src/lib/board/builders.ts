import { createLinear, createShape, createSticky, createText, DEFAULT_STYLE } from '@/lib/board/elements'
import type { ElementStyle, Point, ShapeKind } from '@/lib/board/types'

/** Small helpers for composing ready-made elements (templates, library items). */

export const withStyle = (patch: Partial<ElementStyle> = {}): ElementStyle => ({ ...DEFAULT_STYLE, ...patch })

/** Text centred on `center`. */
export function label(text: string, center: Point, fontSize = 20, style: Partial<ElementStyle> = {}) {
  const element = createText(center, withStyle(style), text, fontSize)
  return { ...element, x: center.x - element.width / 2, y: center.y - element.height / 2 }
}

export function box(kind: ShapeKind, x: number, y: number, width: number, height: number, style: Partial<ElementStyle> = {}) {
  return { ...createShape(kind, { x, y }, withStyle(style)), width, height }
}

export function connector(type: 'line' | 'arrow', from: Point, to: Point, style: Partial<ElementStyle> = {}) {
  return { ...createLinear(type, from, withStyle(style)), points: [from, to] as [Point, Point] }
}

export function note(center: Point, fill: string, text: string) {
  return { ...createSticky(center, withStyle({ fill })), text }
}
