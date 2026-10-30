import { useEffect, useRef, useState } from 'react'
import { worldToScreen } from '@/lib/board/geometry'
import type { Camera, StickyElement } from '@/lib/board/types'

type StickyEditorProps = {
  sticky: StickyElement
  camera: Camera
  onCommit: (text: string) => void
}

/** Textarea laid over a sticky note while its text is edited; matches the canvas text. */
export function StickyEditor({ sticky, camera, onCommit }: StickyEditorProps) {
  const [text, setText] = useState(sticky.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus on the next frame: the click that created the note would otherwise take focus straight back.
  useEffect(() => {
    const frame = requestAnimationFrame(() => textareaRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  const position = worldToScreen(sticky, camera)
  const zoom = camera.zoom

  return (
    <textarea
      ref={textareaRef}
      aria-label="Sticky note text"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.currentTarget.blur()
      }}
      placeholder="Write something…"
      className="absolute resize-none overflow-hidden bg-transparent font-hand font-semibold text-sticky-ink outline-none placeholder:text-sticky-ink/40"
      style={{
        left: position.x,
        top: position.y,
        width: sticky.width * zoom,
        height: sticky.height * zoom,
        padding: 16 * zoom,
        fontSize: 20 * zoom,
        lineHeight: `${24 * zoom}px`,
      }}
    />
  )
}
