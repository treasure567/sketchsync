/** A position in world space (board coordinates) or screen space (CSS pixels). */
export type Point = { x: number; y: number }

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

/**
 * The visible part of the board. A world point p appears on screen at
 * (p - camera) * zoom.
 */
export type Camera = { x: number; y: number; zoom: number }

export type ShapeKind = 'rectangle' | 'diamond' | 'ellipse'

export type ShapeElement = {
  id: string
  type: ShapeKind
  x: number
  y: number
  /** May be negative while the shape is being drawn; normalised when finished. */
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
}

export type LinearElement = {
  id: string
  type: 'line' | 'arrow'
  points: [Point, Point]
  stroke: string
  strokeWidth: number
}

export type FreedrawElement = {
  id: string
  type: 'freedraw'
  points: Point[]
  stroke: string
  strokeWidth: number
}

export type StickyElement = {
  id: string
  type: 'sticky'
  x: number
  y: number
  width: number
  height: number
  text: string
}

export type BoardElement = ShapeElement | LinearElement | FreedrawElement | StickyElement

export type Tool =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'pencil'
  | 'text'
  | 'sticky'
  | 'image'
  | 'eraser'
