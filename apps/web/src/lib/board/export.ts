import { normalizeBox, unionBounds } from '@/lib/board/geometry'
import { getDrawableImage } from '@/lib/board/images'
import { pressureWidth, renderScene } from '@/lib/board/render'
import { STICKY_FONT_FAMILY, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT, wrapText } from '@/lib/board/text'
import type { BoardElement, Bounds, ElementStyle, Point } from '@/lib/board/types'

const PADDING = 32

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Keep the URL alive long enough for slow downloads to start before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function exportBounds(elements: BoardElement[]): Bounds {
  const bounds = unionBounds(elements) ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  return { minX: bounds.minX - PADDING, minY: bounds.minY - PADDING, maxX: bounds.maxX + PADDING, maxY: bounds.maxY + PADDING }
}

/** Draw the elements on a white canvas at `scale` times their size. */
async function renderToCanvas(elements: BoardElement[], scale: number) {
  await document.fonts.ready
  // Images must be decoded before they can be drawn.
  await Promise.all(
    elements.filter((element) => element.type === 'image').map((element) => new Promise<void>((resolve) => (getDrawableImage(element.src, resolve) ? resolve() : undefined))),
  )
  const bounds = exportBounds(elements)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  renderScene(ctx, { elements, camera: { x: bounds.minX, y: bounds.minY, zoom: 1 }, width, height, pixelRatio: scale, background: '#ffffff' })
  return { canvas, ctx, width, height }
}

export async function exportPng(elements: BoardElement[], scale = 2) {
  const { canvas } = await renderToCanvas(elements, scale)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed.'))), 'image/png'))
}

// ---------- SVG ----------

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
const round = (value: number) => Math.round(value * 100) / 100

function pathData(points: Point[], close = false) {
  if (points.length === 1) return `M${round(points[0].x)} ${round(points[0].y)}h0.01`
  let d = `M${round(points[0].x)} ${round(points[0].y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
    d += `Q${round(points[i].x)} ${round(points[i].y)} ${round(mid.x)} ${round(mid.y)}`
  }
  const last = points[points.length - 1]
  return `${d}L${round(last.x)} ${round(last.y)}${close ? 'Z' : ''}`
}

function dashArray(style: ElementStyle) {
  const unit = Math.max(style.strokeWidth, 1)
  if (style.strokeStyle === 'dashed') return ` stroke-dasharray="${unit * 4} ${unit * 3}"`
  if (style.strokeStyle === 'dotted') return ` stroke-dasharray="0.01 ${unit * 2.5}"`
  return ''
}

/** Builds hatch patterns on demand and returns the fill attribute value. */
function fillValue(style: ElementStyle, patterns: Map<string, string>) {
  if (style.fill === 'transparent') return 'none'
  if (style.fillStyle === 'solid') return escapeXml(style.fill)
  const id = `fill-${style.fillStyle}-${style.fill.replace(/[^a-z0-9]/gi, '')}`
  if (!patterns.has(id)) {
    const lines = style.fillStyle === 'cross' ? '<path d="M0 0V9M0 0H9"/>' : '<path d="M0 0V9"/>'
    patterns.set(id, `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><g stroke="${escapeXml(style.fill)}" stroke-width="1.5">${lines}</g></pattern>`)
  }
  return `url(#${id})`
}

function strokeAttrs(style: ElementStyle, width = style.strokeWidth) {
  if (style.stroke === 'transparent') return 'stroke="none"'
  return `stroke="${escapeXml(style.stroke)}" stroke-width="${round(width)}" stroke-linecap="round" stroke-linejoin="round"${dashArray(style)}`
}

function textLines(lines: string[], x: number, y: number, lineHeight: number) {
  return lines.map((line, index) => `<tspan x="${round(x)}" y="${round(y + index * lineHeight)}">${escapeXml(line) || ' '}</tspan>`).join('')
}

function elementToSvg(element: BoardElement, patterns: Map<string, string>, measure: CanvasRenderingContext2D) {
  const { style } = element
  const opacity = style.opacity < 100 ? ` opacity="${style.opacity / 100}"` : ''

  switch (element.type) {
    case 'rectangle': {
      const { x, y, width, height } = normalizeBox(element)
      const radius = style.rounded ? Math.min(12, width / 4, height / 4) : 0
      return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(radius)}" fill="${fillValue(style, patterns)}" ${strokeAttrs(style)}${opacity}/>`
    }
    case 'ellipse': {
      const { x, y, width, height } = normalizeBox(element)
      return `<ellipse cx="${round(x + width / 2)}" cy="${round(y + height / 2)}" rx="${round(width / 2)}" ry="${round(height / 2)}" fill="${fillValue(style, patterns)}" ${strokeAttrs(style)}${opacity}/>`
    }
    case 'diamond': {
      const { x, y, width, height } = normalizeBox(element)
      const points = [`${x + width / 2},${y}`, `${x + width},${y + height / 2}`, `${x + width / 2},${y + height}`, `${x},${y + height / 2}`].join(' ')
      return `<polygon points="${points}" fill="${fillValue(style, patterns)}" ${strokeAttrs(style)}${opacity}/>`
    }
    case 'line':
    case 'arrow': {
      const [start, end] = element.points
      let svg = `<line x1="${round(start.x)}" y1="${round(start.y)}" x2="${round(end.x)}" y2="${round(end.y)}" ${strokeAttrs(style)}/>`
      if (element.type === 'arrow') {
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const size = 10 + style.strokeWidth * 2
        const wing = (offset: number) => `${round(end.x - size * Math.cos(angle + offset))},${round(end.y - size * Math.sin(angle + offset))}`
        svg += `<polyline points="${wing(-Math.PI / 7)} ${round(end.x)},${round(end.y)} ${wing(Math.PI / 7)}" fill="none" ${strokeAttrs({ ...style, strokeStyle: 'solid' })}/>`
      }
      return `<g${opacity}>${svg}</g>`
    }
    case 'freedraw': {
      const fill = style.fill !== 'transparent' && element.points.length > 2 ? `<path d="${pathData(element.points, true)}" fill="${fillValue(style, patterns)}" stroke="none"/>` : ''
      const average = element.points.reduce((sum, p) => sum + (p.p ?? 0.5), 0) / element.points.length
      const width = style.pressure ? pressureWidth(style.strokeWidth, average) : style.strokeWidth
      return `<g${opacity}>${fill}<path d="${pathData(element.points)}" fill="none" ${strokeAttrs({ ...style, strokeStyle: 'solid' }, width)}/></g>`
    }
    case 'sticky': {
      measure.font = `600 20px ${STICKY_FONT_FAMILY}`
      const lines = wrapText(measure, element.text, element.width - 32)
      return `<g${opacity}><rect x="${round(element.x)}" y="${round(element.y)}" width="${round(element.width)}" height="${round(element.height)}" fill="${escapeXml(style.fill)}"/><text font-family='${STICKY_FONT_FAMILY}' font-size="20" font-weight="600" fill="#3f3416" dominant-baseline="hanging">${textLines(lines, element.x + 16, element.y + 16, 24)}</text></g>`
    }
    case 'image': {
      const { x, y, width, height } = normalizeBox(element)
      return `<image href="${escapeXml(element.src)}" x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" preserveAspectRatio="none"${opacity}/>`
    }
    case 'text': {
      const lineHeight = element.fontSize * TEXT_LINE_HEIGHT
      const offset = (lineHeight - element.fontSize) / 2
      return `<text font-family='${TEXT_FONT_FAMILY}' font-size="${round(element.fontSize)}" font-weight="500" fill="${escapeXml(style.stroke)}" dominant-baseline="hanging"${opacity}>${textLines(element.text.split('\n'), element.x, element.y + offset, lineHeight)}</text>`
    }
  }
}

export function exportSvg(elements: BoardElement[]) {
  const bounds = exportBounds(elements)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const patterns = new Map<string, string>()
  const measure = document.createElement('canvas').getContext('2d')!
  const body = elements.map((element) => elementToSvg(element, patterns, measure)).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="${round(bounds.minX)} ${round(bounds.minY)} ${round(width)} ${round(height)}"><defs>${[...patterns.values()].join('')}</defs><rect x="${round(bounds.minX)}" y="${round(bounds.minY)}" width="${round(width)}" height="${round(height)}" fill="#ffffff"/>${body}</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

// ---------- PDF ----------

async function deflate(data: Uint8Array<ArrayBuffer>) {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * A one-page PDF holding the board as an image. The page is sized to the
 * board (1 board pixel = 1 point) and the image is rendered at 2× for print.
 */
export async function exportPdf(elements: BoardElement[]) {
  const scale = 2
  const { canvas, ctx, width, height } = await renderToCanvas(elements, scale)
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const rgb = new Uint8Array(canvas.width * canvas.height * 3)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]
    rgb[j + 1] = rgba[i + 1]
    rgb[j + 2] = rgba[i + 2]
  }
  const image = await deflate(rgb)

  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string | (string | Uint8Array)[]) => {
    offsets[id] = length
    push(`${id} 0 obj\n`)
    for (const chunk of Array.isArray(body) ? body : [body]) push(chunk)
    push('\nendobj\n')
  }

  const pageWidth = round(width)
  const pageHeight = round(height)
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`

  push('%PDF-1.4\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  object(4, [
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`,
    image,
    '\nendstream',
  ])
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  const xrefOffset = length
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
