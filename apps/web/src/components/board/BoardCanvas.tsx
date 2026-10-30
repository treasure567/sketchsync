import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type MouseEvent, type PointerEvent, type SetStateAction } from 'react'
import { creationTools } from '@/components/board/tools'
import type { BoardHistory } from '@/hooks/useBoardHistory'
import { createFreedraw, createLinear, createShape, createSticky, finalizeCreated, resizeFromOrigin } from '@/lib/board/elements'
import { boundsContain, boundsFromPoints, clampZoom, getBounds, hitTest, hitTopmost, screenToWorld, translate, zoomAt } from '@/lib/board/geometry'
import { renderScene } from '@/lib/board/render'
import type { BoardElement, Bounds, Camera, Point, Tool } from '@/lib/board/types'

/** How close (in screen pixels) a pointer must be to an element to hit it. */
const HIT_TOLERANCE = 6

type Interaction =
  | { kind: 'pan'; startScreen: Point; startCamera: Camera }
  | { kind: 'pinch'; startDistance: number; startMid: Point; startCamera: Camera }
  | { kind: 'move'; ids: ReadonlySet<string>; last: Point }
  | { kind: 'marquee'; origin: Point; base: ReadonlySet<string> }
  | { kind: 'create'; id: string; origin: Point }
  | { kind: 'draw'; id: string; last: Point }
  | { kind: 'erase' }

type BoardCanvasProps = {
  elements: BoardElement[]
  camera: Camera
  onCameraChange: Dispatch<SetStateAction<Camera>>
  tool: Tool
  onToolChange: (tool: Tool) => void
  locked: boolean
  /** Space is held, so dragging pans. */
  spaceHeld: boolean
  selectedIds: ReadonlySet<string>
  onSelectionChange: (ids: ReadonlySet<string>) => void
  editingId: string | null
  onEditSticky: (id: string) => void
  history: Pick<BoardHistory, 'begin' | 'update' | 'commit' | 'cancel' | 'apply'>
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** The drawing surface: renders the board and turns pointer input into edits. */
export function BoardCanvas({
  elements,
  camera,
  onCameraChange,
  tool,
  onToolChange,
  locked,
  spaceHeld,
  selectedIds,
  onSelectionChange,
  editingId,
  onEditSticky,
  history,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [panning, setPanning] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Sticky notes use a web font; draw again once it has loaded.
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || size.width === 0) return
    const pixelRatio = window.devicePixelRatio || 1
    const width = Math.round(size.width * pixelRatio)
    const height = Math.round(size.height * pixelRatio)
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    renderScene(ctx, { elements, camera, width: size.width, height: size.height, pixelRatio, selectedIds, editingId, marquee })
  }, [elements, camera, size, selectedIds, editingId, marquee, fontsReady])

  // Wheel pans; Ctrl/⌘ + wheel (and trackpad pinch) zooms. Registered natively so the page itself never zooms.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (event.ctrlKey || event.metaKey) {
        onCameraChange((current) => zoomAt(current, point, current.zoom * Math.exp(-event.deltaY * 0.01)))
        return
      }
      const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX
      const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY
      onCameraChange((current) => ({ ...current, x: current.x + dx / current.zoom, y: current.y + dy / current.zoom }))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [onCameraChange])

  const toScreen = (event: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const eraseAt = (point: Point) => {
    const tolerance = HIT_TOLERANCE / camera.zoom
    history.update((current) => {
      const remaining = current.filter((element) => !hitTest(element, point, tolerance))
      return remaining.length === current.length ? current : remaining
    })
  }

  const startPinch = () => {
    const current = interaction.current
    // A second finger means zoom, not draw: drop whatever the first finger started.
    if (current && (current.kind === 'create' || current.kind === 'draw' || current.kind === 'move' || current.kind === 'erase')) history.cancel()
    setMarquee(null)
    const [a, b] = [...pointers.current.values()]
    interaction.current = { kind: 'pinch', startDistance: distance(a, b) || 1, startMid: midpoint(a, b), startCamera: camera }
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const screen = toScreen(event)
    pointers.current.set(event.pointerId, screen)

    if (pointers.current.size === 2) return startPinch()
    if (pointers.current.size > 2) return

    const world = screenToWorld(screen, camera)

    if (event.button === 1 || tool === 'hand' || spaceHeld) {
      interaction.current = { kind: 'pan', startScreen: screen, startCamera: camera }
      setPanning(true)
      return
    }
    if (event.button !== 0) return

    switch (tool) {
      case 'select': {
        const hit = hitTopmost(elements, world, HIT_TOLERANCE / camera.zoom)
        if (!hit) {
          if (!event.shiftKey) onSelectionChange(new Set())
          interaction.current = { kind: 'marquee', origin: world, base: event.shiftKey ? selectedIds : new Set() }
          return
        }
        let selection = selectedIds
        if (event.shiftKey) {
          const toggled = new Set(selectedIds)
          if (toggled.has(hit.id)) toggled.delete(hit.id)
          else toggled.add(hit.id)
          selection = toggled
        } else if (!selectedIds.has(hit.id)) {
          selection = new Set([hit.id])
        }
        onSelectionChange(selection)
        if (selection.has(hit.id)) {
          history.begin()
          interaction.current = { kind: 'move', ids: selection, last: world }
        }
        return
      }
      case 'rectangle':
      case 'diamond':
      case 'ellipse':
      case 'line':
      case 'arrow': {
        const element = tool === 'line' || tool === 'arrow' ? createLinear(tool, world) : createShape(tool, world)
        onSelectionChange(new Set())
        history.begin()
        history.update((current) => [...current, element])
        interaction.current = { kind: 'create', id: element.id, origin: world }
        return
      }
      case 'pencil': {
        const element = createFreedraw(world)
        onSelectionChange(new Set())
        history.begin()
        history.update((current) => [...current, element])
        interaction.current = { kind: 'draw', id: element.id, last: world }
        return
      }
      case 'sticky': {
        const element = createSticky(world)
        history.apply((current) => [...current, element])
        onSelectionChange(new Set([element.id]))
        onEditSticky(element.id)
        if (!locked) onToolChange('select')
        return
      }
      case 'eraser':
        history.begin()
        interaction.current = { kind: 'erase' }
        eraseAt(world)
        return
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    const screen = toScreen(event)
    pointers.current.set(event.pointerId, screen)
    const current = interaction.current
    if (!current) return

    if (current.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      if (!b) return
      const zoom = clampZoom((current.startCamera.zoom * distance(a, b)) / current.startDistance)
      const anchor = screenToWorld(current.startMid, current.startCamera)
      const mid = midpoint(a, b)
      onCameraChange({ x: anchor.x - mid.x / zoom, y: anchor.y - mid.y / zoom, zoom })
      return
    }

    if (current.kind === 'pan') {
      const { startCamera, startScreen } = current
      onCameraChange({ ...startCamera, x: startCamera.x - (screen.x - startScreen.x) / startCamera.zoom, y: startCamera.y - (screen.y - startScreen.y) / startCamera.zoom })
      return
    }

    const world = screenToWorld(screen, camera)
    switch (current.kind) {
      case 'move': {
        const dx = world.x - current.last.x
        const dy = world.y - current.last.y
        current.last = world
        history.update((all) => all.map((element) => (current.ids.has(element.id) ? translate(element, dx, dy) : element)))
        return
      }
      case 'create':
        history.update((all) =>
          all.map((element) => {
            if (element.id !== current.id) return element
            if (element.type === 'line' || element.type === 'arrow') return { ...element, points: [element.points[0], world] }
            if (element.type === 'rectangle' || element.type === 'diamond' || element.type === 'ellipse') {
              return resizeFromOrigin(element, current.origin, world, event.shiftKey)
            }
            return element
          }),
        )
        return
      case 'draw': {
        // Skip points closer than a pixel apart to keep strokes light.
        if (distance(world, current.last) < 1 / camera.zoom) return
        current.last = world
        history.update((all) => all.map((element) => (element.id === current.id && element.type === 'freedraw' ? { ...element, points: [...element.points, world] } : element)))
        return
      }
      case 'erase':
        eraseAt(world)
        return
      case 'marquee': {
        const box = boundsFromPoints(current.origin, world)
        setMarquee(box)
        const inside = elements.filter((element) => boundsContain(box, getBounds(element))).map((element) => element.id)
        onSelectionChange(new Set([...current.base, ...inside]))
        return
      }
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId)
    const current = interaction.current
    if (!current) return

    if (current.kind === 'pinch') {
      // Wait for every finger to lift so the remaining one doesn't start drawing.
      if (pointers.current.size === 0) interaction.current = null
      return
    }

    interaction.current = null
    switch (current.kind) {
      case 'pan':
        setPanning(false)
        return
      case 'create':
        history.update((all) => all.map((element) => (element.id === current.id ? finalizeCreated(element) : element)))
        history.commit()
        onSelectionChange(new Set([current.id]))
        if (!locked && creationTools.has(tool)) onToolChange('select')
        return
      case 'draw':
      case 'move':
      case 'erase':
        history.commit()
        return
      case 'marquee':
        setMarquee(null)
        return
    }
  }

  const handleDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'select') return
    const rect = event.currentTarget.getBoundingClientRect()
    const world = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, camera)
    const hit = hitTopmost(elements, world, HIT_TOLERANCE / camera.zoom)
    if (hit?.type === 'sticky') onEditSticky(hit.id)
  }

  const cursor = panning ? 'cursor-grabbing' : tool === 'hand' || spaceHeld ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'

  return (
    <canvas
      ref={canvasRef}
      aria-label="Whiteboard canvas"
      className={clsx('absolute inset-0 size-full touch-none', cursor)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  )
}
