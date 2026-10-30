import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cameraToFit, unionBounds } from '@/lib/board/geometry'
import { renderScene } from '@/lib/board/render'
import type { BoardElement } from '@/lib/board/types'

type ElementsPreviewProps = {
  elements: BoardElement[]
  className?: string
  /** Padding around the content in CSS pixels. */
  padding?: number
}

/** Static thumbnail of some elements, scaled to fit its box. */
export function ElementsPreview({ elements, className, padding = 12 }: ElementsPreviewProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext('2d')
    const bounds = unionBounds(elements)
    if (!canvas || !container || !ctx || !bounds || width === 0) return
    const height = container.clientHeight
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    const draw = () =>
      renderScene(ctx, { elements, camera: cameraToFit(bounds, width, height, padding, 1.5), width, height, pixelRatio, onImageLoad: draw })
    draw()
    // Redraw once web fonts are ready so text renders in the right typeface.
    document.fonts.ready.then(draw)
  }, [elements, width, padding, containerRef])

  return (
    <div ref={containerRef} className={clsx('relative', className)} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
