import { useEffect, useRef, useState } from 'react'
import { worldToScreen } from '@/lib/board/geometry'
import { measureText, STICKY_FONT_FAMILY, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from '@/lib/board/text'
import type { Camera, StickyElement, TextElement } from '@/lib/board/types'

type TextEditorProps = {
  element: StickyElement | TextElement
  camera: Camera
  onCommit: (text: string) => void
}

/** Textarea laid over a sticky note or text element while it is edited; matches the canvas text. */
export function TextEditor({ element, camera, onCommit }: TextEditorProps) {
  const [text, setText] = useState(element.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus on the next frame: the click that created the element would otherwise take focus straight back.
  useEffect(() => {
    const frame = requestAnimationFrame(() => textareaRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  const { zoom } = camera
  const position = worldToScreen(element, camera)
  const isSticky = element.type === 'sticky'

  const style = isSticky
    ? {
        width: element.width * zoom,
        height: element.height * zoom,
        padding: 16 * zoom,
        fontSize: 20 * zoom,
        lineHeight: `${24 * zoom}px`,
        fontFamily: STICKY_FONT_FAMILY,
        fontWeight: 600,
        color: '#3f3416',
      }
    : (() => {
        const size = measureText(text || ' ', element.fontSize)
        return {
          width: (size.width + element.fontSize) * zoom,
          height: size.height * zoom,
          fontSize: element.fontSize * zoom,
          lineHeight: TEXT_LINE_HEIGHT,
          fontFamily: TEXT_FONT_FAMILY,
          fontWeight: 500,
          color: element.style.stroke,
        }
      })()

  return (
    <textarea
      ref={textareaRef}
      aria-label={isSticky ? 'Sticky note text' : 'Text'}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) event.currentTarget.blur()
      }}
      placeholder={isSticky ? 'Write something…' : 'Type here…'}
      wrap={isSticky ? 'soft' : 'off'}
      className="absolute resize-none overflow-hidden bg-transparent outline-none placeholder:opacity-40"
      style={{ left: position.x, top: position.y, ...style, whiteSpace: isSticky ? 'pre-wrap' : 'pre' }}
    />
  )
}
