/** A position in world space (board coordinates) or screen space (CSS pixels). */
export type Point = { x: number; y: number }

/** A freehand point; `p` is pen pressure from 0 to 1. */
export type StrokePoint = Point & { p?: number }

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

/**
 * The visible part of the board. A world point p appears on screen at
 * (p - camera) * zoom.
 */
export type Camera = { x: number; y: number; zoom: number }

export type FillStyle = 'solid' | 'hatch' | 'cross'
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

export type ElementStyle = {
  /** Outline (or text) colour, or 'transparent'. */
  stroke: string
  /** Background colour, or 'transparent'. */
  fill: string
  fillStyle: FillStyle
  strokeWidth: number
  strokeStyle: StrokeStyle
  /** 0 to 100. */
  opacity: number
  /** Rounded corners on rectangles. */
  rounded: boolean
  /** Freehand stroke width follows pen pressure. */
  pressure: boolean
}

type ElementBase = {
  id: string
  style: ElementStyle
  /** Locked elements can be selected but not moved, resized or erased. */
  locked?: boolean
}

export type ShapeKind = 'rectangle' | 'diamond' | 'ellipse'

type Box = {
  x: number
  y: number
  /** May be negative while the element is being drawn; normalised when finished. */
  width: number
  height: number
}

export type ShapeElement = ElementBase & Box & { type: ShapeKind }

export type LinearElement = ElementBase & { type: 'line' | 'arrow'; points: [Point, Point] }

export type FreedrawElement = ElementBase & { type: 'freedraw'; points: StrokePoint[] }

export type StickyElement = ElementBase & Box & { type: 'sticky'; text: string }

export type TextElement = ElementBase & Box & { type: 'text'; text: string; fontSize: number }

export type BoardElement = ShapeElement | LinearElement | FreedrawElement | StickyElement | TextElement

export type ElementType = BoardElement['type']

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
