export const TEXT_FONT_FAMILY = '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif'
export const STICKY_FONT_FAMILY = '"Caveat Variable", cursive'
export const TEXT_LINE_HEIGHT = 1.25

export const textFont = (fontSize: number) => `500 ${fontSize}px ${TEXT_FONT_FAMILY}`

let measureContext: CanvasRenderingContext2D | null = null

function context() {
  measureContext ??= document.createElement('canvas').getContext('2d')
  return measureContext
}

/** Width and height of multi-line text at the given size. */
export function measureText(text: string, fontSize: number) {
  const lines = text.split('\n')
  const ctx = context()
  let width = 0
  if (ctx) {
    ctx.font = textFont(fontSize)
    width = Math.max(...lines.map((line) => ctx.measureText(line).width))
  }
  return { width: Math.ceil(width) + 2, height: Math.ceil(lines.length * fontSize * TEXT_LINE_HEIGHT) }
}

/** Break text into lines no wider than `maxWidth`, keeping explicit line breaks. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
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
