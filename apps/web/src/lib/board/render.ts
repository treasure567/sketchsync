import { boundsIntersect, getBounds, handlePositions, normalizeBox, pointsBounds, unionBounds, viewportBounds } from '@/lib/board/geometry'
import { getDrawableImage } from '@/lib/board/images'
import { STICKY_FONT_FAMILY, TEXT_LINE_HEIGHT, textFont, wrapText } from '@/lib/board/text'
import type { BoardElement, Bounds, Camera, ElementStyle, Point, StrokePoint } from '@/lib/board/types'

const SELECTION_COLOR = '#5b4cf5'
const STICKY_INK = '#3f3416'
const STICKY_FONT = `600 20px ${STICKY_FONT_FAMILY}`
const STICKY_PADDING = 16
const STICKY_LINE_HEIGHT = 24
/** Selection padding and handle size, in screen pixels. */
export const SELECTION_PADDING = 6
export const HANDLE_SIZE = 8

export type Scene = {
  elements: BoardElement[]
  camera: Camera
  /** Viewport size in CSS pixels. */
  width: number
  height: number
  pixelRatio: number
  selectedIds?: ReadonlySet<string>
  /** Element whose text is being edited in an overlay, so its text is not drawn. */
  editingId?: string | null
  marquee?: Bounds | null
  /** Show resize handles and the size badge around the selection. */
  showHandles?: boolean
  /** Fill colour behind the board, e.g. for exported images. */
  background?: string
  /** Colour of selection outlines, handles and the marquee. */
  selectionColor?: string
  /** Spacing of a background dot grid in world units, or 0 for none. */
  gridSize?: number
  /** Called when an image finishes loading, so the scene can be redrawn. */
  onImageLoad?: () => void
}

function dashFor(style: ElementStyle) {
  const unit = Math.max(style.strokeWidth, 1)
  if (style.strokeStyle === 'dashed') return [unit * 4, unit * 3]
  if (style.strokeStyle === 'dotted') return [0.01, unit * 2.5]
  return []
}

/** Fill the current path with the style's background: solid, or hatched lines clipped to the shape. */
function fillPath(ctx: CanvasRenderingContext2D, path: Path2D, style: ElementStyle, bounds: Bounds) {
  if (style.fill === 'transparent') return
  if (style.fillStyle === 'solid') {
    ctx.fillStyle = style.fill
    ctx.fill(path)
    return
  }
  ctx.save()
  ctx.clip(path)
  ctx.strokeStyle = style.fill
  ctx.lineWidth = 1.5
  ctx.setLineDash([])
  const gap = 9
  const size = bounds.maxX - bounds.minX + bounds.maxY - bounds.minY
  ctx.beginPath()
  for (let offset = -size; offset < size; offset += gap) {
    ctx.moveTo(bounds.minX + offset, bounds.maxY)
    ctx.lineTo(bounds.minX + offset + size, bounds.maxY - size)
    if (style.fillStyle === 'cross') {
      ctx.moveTo(bounds.minX + offset, bounds.minY)
      ctx.lineTo(bounds.minX + offset + size, bounds.minY + size)
    }
  }
  ctx.stroke()
  ctx.restore()
}

function strokePath(ctx: CanvasRenderingContext2D, path: Path2D, style: ElementStyle) {
  if (style.stroke === 'transparent') return
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = style.strokeWidth
  ctx.setLineDash(dashFor(style))
  ctx.stroke(path)
  ctx.setLineDash([])
}

/** Smooth path through the points using quadratic curves between midpoints. */
export function tracePoints(ctx: CanvasRenderingContext2D | Path2D, points: Point[]) {
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y)
    return
  }
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y)
  }
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
}

/** Stroke width at a point: thicker with more pressure. */
export const pressureWidth = (strokeWidth: number, p = 0.5) => strokeWidth * (0.4 + p * 1.4)

function drawFreedraw(ctx: CanvasRenderingContext2D, points: StrokePoint[], style: ElementStyle) {
  if (style.fill !== 'transparent' && points.length > 2) {
    const outline = new Path2D()
    tracePoints(outline, points)
    outline.closePath()
    fillPath(ctx, outline, style, pointsBounds(points))
  }
  ctx.strokeStyle = style.stroke

  if (!style.pressure || points.length < 3) {
    ctx.lineWidth = style.strokeWidth
    ctx.beginPath()
    tracePoints(ctx, points)
    ctx.stroke()
    return
  }

  // Variable width: draw each curve segment with the width at its control point.
  let from = points[0]
  for (let i = 1; i < points.length - 1; i++) {
    const to = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    ctx.lineWidth = pressureWidth(style.strokeWidth, points[i].p)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(points[i].x, points[i].y, to.x, to.y)
    ctx.stroke()
    from = to
  }
  const last = points[points.length - 1]
  ctx.lineWidth = pressureWidth(style.strokeWidth, last.p)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, strokeWidth: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const size = 10 + strokeWidth * 2
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(to.x - size * Math.cos(angle - Math.PI / 7), to.y - size * Math.sin(angle - Math.PI / 7))
  ctx.lineTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7), to.y - size * Math.sin(angle + Math.PI / 7))
  ctx.stroke()
}

function drawSticky(ctx: CanvasRenderingContext2D, element: Extract<BoardElement, { type: 'sticky' }>, showText: boolean) {
  ctx.save()
  ctx.shadowColor = 'rgba(60, 50, 10, 0.18)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 6
  ctx.fillStyle = element.style.fill === 'transparent' ? '#fdf1c4' : element.style.fill
  ctx.fillRect(element.x, element.y, element.width, element.height)
  ctx.restore()

  if (!showText) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(element.x, element.y, element.width, element.height)
  ctx.clip()
  ctx.font = STICKY_FONT
  ctx.textBaseline = 'top'
  ctx.fillStyle = element.text ? STICKY_INK : 'rgba(63, 52, 22, 0.4)'
  const lines = wrapText(ctx, element.text || 'Double-click to write…', element.width - STICKY_PADDING * 2)
  lines.forEach((line, index) => ctx.fillText(line, element.x + STICKY_PADDING, element.y + STICKY_PADDING + index * STICKY_LINE_HEIGHT))
  ctx.restore()
}

function drawText(ctx: CanvasRenderingContext2D, element: Extract<BoardElement, { type: 'text' }>) {
  ctx.font = textFont(element.fontSize)
  ctx.textBaseline = 'top'
  ctx.fillStyle = element.style.stroke === 'transparent' ? '#1f2433' : element.style.stroke
  const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
  const offset = (lineHeight - element.fontSize) / 2
  element.text.split('\n').forEach((line, index) => ctx.fillText(line, element.x, element.y + offset + index * lineHeight))
}

export function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement, editingId?: string | null, onImageLoad?: () => void) {
  const { style } = element
  ctx.globalAlpha = style.opacity / 100

  switch (element.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      const { x, y, width, height } = normalizeBox(element)
      const path = new Path2D()
      if (element.type === 'rectangle') {
        path.roundRect(x, y, width, height, style.rounded ? Math.min(12, width / 4, height / 4) : 0)
      } else if (element.type === 'ellipse') {
        path.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
      } else {
        path.moveTo(x + width / 2, y)
        path.lineTo(x + width, y + height / 2)
        path.lineTo(x + width / 2, y + height)
        path.lineTo(x, y + height / 2)
        path.closePath()
      }
      fillPath(ctx, path, style, { minX: x, minY: y, maxX: x + width, maxY: y + height })
      strokePath(ctx, path, style)
      break
    }
    case 'line':
    case 'arrow': {
      const [start, end] = element.points
      const path = new Path2D()
      path.moveTo(start.x, start.y)
      path.lineTo(end.x, end.y)
      strokePath(ctx, path, style)
      if (element.type === 'arrow' && style.stroke !== 'transparent') drawArrowhead(ctx, start, end, style.strokeWidth)
      break
    }
    case 'freedraw':
      drawFreedraw(ctx, element.points, style)
      break
    case 'sticky':
      drawSticky(ctx, element, element.id !== editingId)
      break
    case 'text':
      if (element.id !== editingId) drawText(ctx, element)
      break
    case 'image': {
      const { x, y, width, height } = normalizeBox(element)
      const image = getDrawableImage(element.src, onImageLoad)
      if (image) {
        ctx.drawImage(image, x, y, width, height)
      } else {
        ctx.fillStyle = '#eceef4'
        ctx.fillRect(x, y, width, height)
      }
      break
    }
  }
  ctx.globalAlpha = 1
}

function drawSelection(ctx: CanvasRenderingContext2D, scene: Scene, selected: BoardElement[]) {
  const { camera } = scene
  const color = scene.selectionColor ?? SELECTION_COLOR
  const zoom = camera.zoom
  const padding = SELECTION_PADDING / zoom

  ctx.strokeStyle = color
  ctx.lineWidth = 1.5 / zoom
  for (const element of selected) {
    const { minX, minY, maxX, maxY } = getBounds(element)
    ctx.setLineDash(element.locked ? [4 / zoom, 4 / zoom] : [])
    ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2)
  }
  ctx.setLineDash([])

  const bounds = unionBounds(selected)
  if (!bounds || !scene.showHandles) return

  if (selected.length > 1) {
    ctx.setLineDash([5 / zoom, 4 / zoom])
    ctx.strokeRect(bounds.minX - padding, bounds.minY - padding, bounds.maxX - bounds.minX + padding * 2, bounds.maxY - bounds.minY + padding * 2)
    ctx.setLineDash([])
  }

  const size = HANDLE_SIZE / zoom
  ctx.fillStyle = '#ffffff'
  for (const handle of handlePositions(bounds, padding)) {
    ctx.fillRect(handle.x - size / 2, handle.y - size / 2, size, size)
    ctx.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size)
  }

  // Size badge under the selection, at constant screen size.
  const label = `${Math.round(bounds.maxX - bounds.minX)} × ${Math.round(bounds.maxY - bounds.minY)} px`
  ctx.font = `600 ${11 / zoom}px ui-monospace, monospace`
  const textWidth = ctx.measureText(label).width
  const badgeWidth = textWidth + 12 / zoom
  const badgeHeight = 18 / zoom
  const badgeX = (bounds.minX + bounds.maxX) / 2 - badgeWidth / 2
  const badgeY = bounds.maxY + padding + 10 / zoom
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4 / zoom)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, badgeX + 6 / zoom, badgeY + badgeHeight / 2)
}

/** Dots at every grid intersection, skipped when zoomed out so far they would blur together. */
function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, width: number, height: number, gridSize: number) {
  let step = gridSize
  while (step * camera.zoom < 12) step *= 2
  const visible = viewportBounds(camera, width, height)
  const radius = 1.1 / camera.zoom
  ctx.fillStyle = '#d3d3e0'
  ctx.beginPath()
  for (let x = Math.floor(visible.minX / step) * step; x <= visible.maxX; x += step) {
    for (let y = Math.floor(visible.minY / step) * step; y <= visible.maxY; y += step) {
      ctx.moveTo(x + radius, y)
      ctx.arc(x, y, radius, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}

/** Draw the board. Elements outside the viewport are skipped. */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { elements, camera, width, height, pixelRatio, selectedIds, editingId, marquee, background } = scene
  const scale = camera.zoom * pixelRatio

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width * pixelRatio, height * pixelRatio)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width * pixelRatio, height * pixelRatio)
  }
  ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (scene.gridSize) drawGrid(ctx, camera, width, height, scene.gridSize)

  const visible = viewportBounds(camera, width, height)
  const selected: BoardElement[] = []
  for (const element of elements) {
    if (selectedIds?.has(element.id)) selected.push(element)
    if (boundsIntersect(getBounds(element), visible)) drawElement(ctx, element, editingId, scene.onImageLoad)
  }

  if (selected.length > 0) drawSelection(ctx, scene, selected)

  if (marquee) {
    ctx.strokeStyle = scene.selectionColor ?? SELECTION_COLOR
    ctx.lineWidth = 1 / camera.zoom
    ctx.fillStyle = ctx.strokeStyle
    ctx.globalAlpha = 0.08
    ctx.fillRect(marquee.minX, marquee.minY, marquee.maxX - marquee.minX, marquee.maxY - marquee.minY)
    ctx.globalAlpha = 1
    ctx.strokeRect(marquee.minX, marquee.minY, marquee.maxX - marquee.minX, marquee.maxY - marquee.minY)
  }
}
