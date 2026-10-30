import { Map as MapIcon, X } from 'lucide-react'
import { useEffect, useRef, type PointerEvent } from 'react'
import { cameraToFit, unionBounds, viewportBounds } from '@/lib/board/geometry'
import { renderScene } from '@/lib/board/render'
import type { BoardElement, Bounds, Camera, Point } from '@/lib/board/types'

const WIDTH = 200
const HEIGHT = 120

type MinimapProps = {
  elements: BoardElement[]
  camera: Camera
  /** Size of the main viewport in CSS pixels. */
  viewport: { width: number; height: number }
  /** Centre the main view on this world point. */
  onNavigate: (center: Point) => void
  onClose: () => void
}

/** Overview of the whole board with the visible area outlined; click or drag to move there. */
export function Minimap({ elements, camera, viewport, onNavigate, onClose }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)

  const visible = viewportBounds(camera, viewport.width, viewport.height)
  const content = unionBounds(elements)
  const world: Bounds = content
    ? {
        minX: Math.min(content.minX, visible.minX),
        minY: Math.min(content.minY, visible.minY),
        maxX: Math.max(content.maxX, visible.maxX),
        maxY: Math.max(content.maxY, visible.maxY),
      }
    : visible
  const miniCamera = cameraToFit(world, WIDTH, HEIGHT, 8, Infinity)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = WIDTH * pixelRatio
    canvas.height = HEIGHT * pixelRatio
    renderScene(ctx, { elements, camera: miniCamera, width: WIDTH, height: HEIGHT, pixelRatio, background: '#f6f6fb' })

    // Outline of the area the main view shows.
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    const x = (visible.minX - miniCamera.x) * miniCamera.zoom
    const y = (visible.minY - miniCamera.y) * miniCamera.zoom
    const w = (visible.maxX - visible.minX) * miniCamera.zoom
    const h = (visible.maxY - visible.minY) * miniCamera.zoom
    ctx.fillStyle = 'rgba(91, 76, 245, 0.08)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = '#5b4cf5'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, w, h)
  })

  const navigate = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    onNavigate({ x: (event.clientX - rect.left) / miniCamera.zoom + miniCamera.x, y: (event.clientY - rect.top) / miniCamera.zoom + miniCamera.y })
  }

  return (
    <section aria-label="Minimap" className="pointer-events-auto rounded-xl border border-line bg-surface p-2 shadow-md">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <h2 className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-ink-muted uppercase">
          <MapIcon className="size-3" aria-hidden="true" />
          Minimap
        </h2>
        <button type="button" aria-label="Hide minimap" onClick={onClose} className="text-ink-subtle hover:text-ink">
          <X className="size-3.5" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Board overview. Click to move the view."
        className="block cursor-pointer touch-none rounded-md"
        style={{ width: WIDTH, height: HEIGHT }}
        onPointerDown={(event) => {
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          navigate(event)
        }}
        onPointerMove={(event) => dragging.current && navigate(event)}
        onPointerUp={() => (dragging.current = false)}
      />
    </section>
  )
}
