import { boundsIntersect, getBounds, normalizeBox, viewportBounds } from '@/lib/board/geometry'
import type { BoardElement, Bounds, Camera, Point } from '@/lib/board/types'

const SELECTION_COLOR = '#5b4cf5'
const STICKY_FILL = '#fdf1c4'
const STICKY_INK = '#3f3416'
const STICKY_FONT = '600 20px "Caveat Variable", cursive'
const STICKY_PADDING = 16
const STICKY_LINE_HEIGHT = 24

export type Scene = {
  elements: BoardElement[]
  camera: Camera
  /** Viewport size in CSS pixels. */
  width: number
  height: number
  pixelRatio: number
  selectedIds: ReadonlySet<string>
  /** Sticky note whose text is being edited in an overlay, so its text is not drawn. */
  editingId?: string | null
  marquee?: Bounds | null
}

function drawFreedraw(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y)
  } else {
    // Quadratic curves through the midpoints smooth out pointer jitter.
    for (let i = 1; i < points.length - 1; i++) {
      const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
      ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y)
    }
    const last = points[points.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  ctx.stroke()
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const size = 14
  ctx.beginPath()
  ctx.moveTo(to.x - size * Math.cos(angle - Math.PI / 7), to.y - size * Math.sin(angle - Math.PI / 7))
  ctx.lineTo(to.x, to.y)
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7), to.y - size * Math.sin(angle + Math.PI / 7))
  ctx.stroke()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}

function drawSticky(ctx: CanvasRenderingContext2D, element: Extract<BoardElement, { type: 'sticky' }>, showText: boolean) {
  ctx.save()
  ctx.shadowColor = 'rgba(60, 50, 10, 0.18)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 6
  ctx.fillStyle = STICKY_FILL
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

function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement, editingId: string | null | undefined) {
  switch (element.type) {
    case 'rectangle':
    case 'diamond':
    case 'ellipse': {
      const { x, y, width, height } = normalizeBox(element)
      ctx.beginPath()
      if (element.type === 'rectangle') {
        ctx.roundRect(x, y, width, height, Math.min(10, width / 4, height / 4))
      } else if (element.type === 'ellipse') {
        ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
      } else {
        ctx.moveTo(x + width / 2, y)
        ctx.lineTo(x + width, y + height / 2)
        ctx.lineTo(x + width / 2, y + height)
        ctx.lineTo(x, y + height / 2)
        ctx.closePath()
      }
      ctx.fillStyle = element.fill
      ctx.fill()
      if (element.stroke !== 'transparent') {
        ctx.strokeStyle = element.stroke
        ctx.lineWidth = element.strokeWidth
        ctx.stroke()
      }
      return
    }
    case 'line':
    case 'arrow': {
      const [start, end] = element.points
      ctx.strokeStyle = element.stroke
      ctx.lineWidth = element.strokeWidth
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      if (element.type === 'arrow') drawArrowhead(ctx, start, end)
      return
    }
    case 'freedraw':
      ctx.strokeStyle = element.stroke
      ctx.lineWidth = element.strokeWidth
      drawFreedraw(ctx, element.points)
      return
    case 'sticky':
      drawSticky(ctx, element, element.id !== editingId)
  }
}

/** Draw the board. Elements outside the viewport are skipped. */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { elements, camera, width, height, pixelRatio, selectedIds, editingId, marquee } = scene
  const scale = camera.zoom * pixelRatio

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width * pixelRatio, height * pixelRatio)
  ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const visible = viewportBounds(camera, width, height)
  for (const element of elements) {
    if (boundsIntersect(getBounds(element), visible)) drawElement(ctx, element, editingId)
  }

  // Selection outlines keep a constant on-screen thickness.
  const padding = 6 / camera.zoom
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1.5 / camera.zoom
  for (const element of elements) {
    if (!selectedIds.has(element.id)) continue
    const { minX, minY, maxX, maxY } = getBounds(element)
    ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2)
  }

  if (marquee) {
    ctx.fillStyle = 'rgba(91, 76, 245, 0.08)'
    ctx.lineWidth = 1 / camera.zoom
    ctx.fillRect(marquee.minX, marquee.minY, marquee.maxX - marquee.minX, marquee.maxY - marquee.minY)
    ctx.strokeRect(marquee.minX, marquee.minY, marquee.maxX - marquee.minX, marquee.maxY - marquee.minY)
  }
}
