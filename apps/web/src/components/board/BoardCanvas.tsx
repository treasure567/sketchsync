import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type Dispatch, type MouseEvent, type PointerEvent, type SetStateAction } from 'react'
import { creationTools } from '@/components/board/tools'
import type { BoardHistory } from '@/hooks/useBoardHistory'
import { expandGroups } from '@/lib/board/actions'
import { bindNewConnector, detachFromStaticShapes, updateBindings } from '@/lib/board/bindings'
import { createFreedraw, createLinear, createShape, createSticky, createText, finalizeCreated, resizeFromOrigin } from '@/lib/board/elements'
import {
  boundsContain,
  boundsFromPoints,
  clampZoom,
  getBounds,
  handleCursors,
  handlePositions,
  hitTest,
  hitTopmost,
  resizeBounds,
  scaleElement,
  screenToWorld,
  translate,
  unionBounds,
  worldToScreen,
  zoomAt,
  type HandleId,
} from '@/lib/board/geometry'
import { isAcceptedImage } from '@/lib/board/images'
import { LIBRARY_DRAG_TYPE } from '@/lib/board/library'
import { HANDLE_SIZE, renderScene, SELECTION_PADDING } from '@/lib/board/render'
import type { BoardElement, Bounds, Camera, ElementStyle, Point, Tool } from '@/lib/board/types'

/** How close (in screen pixels) a pointer must be to an element to hit it. */
const HIT_TOLERANCE = 6
/** Ignore touches for this long after a pen was used, so a resting palm doesn't draw. */
const PALM_REJECTION_MS = 1500
/** How long a laser pointer trail stays visible. */
const LASER_FADE_MS = 900

type Interaction =
  | { kind: 'pan'; startScreen: Point; startCamera: Camera }
  | { kind: 'pinch'; startDistance: number; startMid: Point; startCamera: Camera }
  | { kind: 'move'; start: Point; startBounds: Bounds; originals: Map<string, BoardElement> }
  | { kind: 'resize'; handle: HandleId; startBounds: Bounds; originals: Map<string, BoardElement> }
  | { kind: 'marquee'; origin: Point; base: ReadonlySet<string> }
  | { kind: 'create'; id: string; origin: Point }
  | { kind: 'draw'; id: string; last: Point; lastScreen: Point; pressure: number }
  | { kind: 'erase' }
  | { kind: 'laser' }

type BoardCanvasProps = {
  elements: BoardElement[]
  camera: Camera
  onCameraChange: Dispatch<SetStateAction<Camera>>
  tool: Tool
  onToolChange: (tool: Tool) => void
  /** Style given to newly drawn elements. */
  currentStyle: ElementStyle
  /** Colour of selection frames: the user's cursor colour. */
  selectionColor: string
  /** Font size for new text. */
  currentFontSize: number
  locked: boolean
  /** Space is held, so dragging pans. */
  spaceHeld: boolean
  /** Grid spacing in world units when snapping is on, otherwise 0. */
  gridSize: number
  selectedIds: ReadonlySet<string>
  onSelectionChange: (ids: ReadonlySet<string>) => void
  editingId: string | null
  /** Open the text editor for a sticky note or text element. */
  onEditText: (id: string) => void
  onContextMenu: (screen: Point, world: Point) => void
  onLibraryDrop: (itemId: string, world: Point) => void
  onImageDrop: (files: File[], world: Point) => void
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
  currentStyle,
  selectionColor,
  currentFontSize,
  locked,
  spaceHeld,
  gridSize,
  selectedIds,
  onSelectionChange,
  editingId,
  onEditText,
  onContextMenu,
  onLibraryDrop,
  onImageDrop,
  history,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const laserCanvasRef = useRef<HTMLCanvasElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const lastPenAt = useRef(0)
  const laserTrail = useRef<{ point: Point; time: number }[]>([])
  const laserFrame = useRef(0)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [panning, setPanning] = useState(false)
  const [hoverCursor, setHoverCursor] = useState<string | null>(null)
  const [assetsVersion, setAssetsVersion] = useState(0)

  const selected = elements.filter((element) => selectedIds.has(element.id))
  const canTransform = tool === 'select' && selected.length > 0 && selected.every((element) => !element.locked)
  const snap = (value: number) => (gridSize ? Math.round(value / gridSize) * gridSize : value)
  const snapPoint = (point: Point) => ({ x: snap(point.x), y: snap(point.y) })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  // Text uses web fonts; draw again once they have loaded.
  useEffect(() => {
    document.fonts.ready.then(() => setAssetsVersion((version) => version + 1))
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
    renderScene(ctx, {
      elements,
      camera,
      width: size.width,
      height: size.height,
      pixelRatio,
      selectedIds,
      editingId,
      marquee,
      showHandles: canTransform && !marquee,
      selectionColor,
      gridSize,
      // Images decode asynchronously; redraw when each one is ready.
      onImageLoad: () => setAssetsVersion((version) => version + 1),
    })
  }, [elements, camera, size, selectedIds, editingId, marquee, canTransform, selectionColor, gridSize, assetsVersion])

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

  useEffect(() => () => cancelAnimationFrame(laserFrame.current), [])

  /** Draw the fading laser trail on its overlay, frame by frame, until it has faded out. */
  const animateLaser = () => {
    cancelAnimationFrame(laserFrame.current)
    const draw = () => {
      const canvas = laserCanvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * pixelRatio)
      canvas.height = Math.round(canvas.clientHeight * pixelRatio)
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      const now = performance.now()
      laserTrail.current = laserTrail.current.filter((entry) => now - entry.time < LASER_FADE_MS)
      const trail = laserTrail.current
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = '#f0475e'
      ctx.shadowBlur = 8
      for (let i = 1; i < trail.length; i++) {
        const age = (now - trail[i].time) / LASER_FADE_MS
        const from = worldToScreen(trail[i - 1].point, camera)
        const to = worldToScreen(trail[i].point, camera)
        ctx.strokeStyle = `rgba(240, 71, 94, ${1 - age})`
        ctx.lineWidth = 4 * (1 - age * 0.6)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
      }
      if (trail.length > 0 || interaction.current?.kind === 'laser') laserFrame.current = requestAnimationFrame(draw)
    }
    laserFrame.current = requestAnimationFrame(draw)
  }

  const toScreen = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const hitHandle = (world: Point): HandleId | null => {
    if (!canTransform) return null
    const bounds = unionBounds(selected)
    if (!bounds) return null
    const reach = HANDLE_SIZE / camera.zoom
    const handle = handlePositions(bounds, SELECTION_PADDING / camera.zoom).find((h) => Math.abs(h.x - world.x) <= reach && Math.abs(h.y - world.y) <= reach)
    return handle?.id ?? null
  }

  const eraseAt = (point: Point) => {
    const tolerance = HIT_TOLERANCE / camera.zoom
    history.update((current) => {
      const remaining = current.filter((element) => element.locked || !hitTest(element, point, tolerance))
      return remaining.length === current.length ? current : updateBindings(remaining)
    })
  }

  const startPinch = () => {
    const current = interaction.current
    // A second finger means zoom, not draw: drop whatever the first finger started.
    if (current && ['create', 'draw', 'move', 'resize', 'erase'].includes(current.kind)) history.cancel()
    setMarquee(null)
    const [a, b] = [...pointers.current.values()]
    interaction.current = { kind: 'pinch', startDistance: distance(a, b) || 1, startMid: midpoint(a, b), startCamera: camera }
  }

  const finishCreation = () => {
    if (!locked && creationTools.has(tool)) onToolChange('select')
  }

  const addTextAt = (world: Point) => {
    const element = createText(world, currentStyle, '', currentFontSize)
    history.apply((current) => [...current, element])
    onSelectionChange(new Set([element.id]))
    onEditText(element.id)
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'pen') lastPenAt.current = Date.now()
    if (event.pointerType === 'touch' && Date.now() - lastPenAt.current < PALM_REJECTION_MS) return

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
        const handle = hitHandle(world)
        if (handle) {
          history.begin()
          interaction.current = { kind: 'resize', handle, startBounds: unionBounds(selected)!, originals: new Map(selected.map((element) => [element.id, element])) }
          return
        }
        const hit = hitTopmost(elements, world, HIT_TOLERANCE / camera.zoom)
        if (!hit) {
          if (!event.shiftKey) onSelectionChange(new Set())
          interaction.current = { kind: 'marquee', origin: world, base: event.shiftKey ? selectedIds : new Set() }
          return
        }
        // Clicking any member of a group selects the whole group.
        const hitGroup = expandGroups(elements, new Set([hit.id]))
        let selection: ReadonlySet<string> = selectedIds
        if (event.shiftKey) {
          const toggled = new Set(selectedIds)
          const remove = selectedIds.has(hit.id)
          hitGroup.forEach((id) => (remove ? toggled.delete(id) : toggled.add(id)))
          selection = toggled
        } else if (!selectedIds.has(hit.id)) {
          selection = hitGroup
        }
        onSelectionChange(selection)
        const movable = elements.filter((element) => selection.has(element.id) && !element.locked)
        if (movable.some((element) => element.id === hit.id)) {
          history.begin()
          interaction.current = { kind: 'move', start: world, startBounds: unionBounds(movable)!, originals: new Map(movable.map((element) => [element.id, element])) }
        }
        return
      }
      case 'rectangle':
      case 'diamond':
      case 'ellipse':
      case 'line':
      case 'arrow': {
        const origin = snapPoint(world)
        const element = tool === 'line' || tool === 'arrow' ? createLinear(tool, origin, currentStyle) : createShape(tool, origin, currentStyle)
        onSelectionChange(new Set())
        history.begin()
        history.update((current) => [...current, element])
        interaction.current = { kind: 'create', id: element.id, origin }
        return
      }
      case 'pencil': {
        const pressure = event.pointerType === 'pen' ? event.pressure : 0.5
        const element = createFreedraw({ ...world, p: pressure }, currentStyle)
        onSelectionChange(new Set())
        history.begin()
        history.update((current) => [...current, element])
        interaction.current = { kind: 'draw', id: element.id, last: world, lastScreen: screen, pressure }
        return
      }
      case 'sticky': {
        const element = createSticky(snapPoint(world), currentStyle)
        history.apply((current) => [...current, element])
        onSelectionChange(new Set([element.id]))
        onEditText(element.id)
        finishCreation()
        return
      }
      case 'text':
        addTextAt(snapPoint(world))
        finishCreation()
        return
      case 'eraser':
        history.begin()
        interaction.current = { kind: 'erase' }
        eraseAt(world)
        return
      case 'laser':
        interaction.current = { kind: 'laser' }
        laserTrail.current.push({ point: world, time: performance.now() })
        animateLaser()
        return
    }
  }

  const updateHoverCursor = (screen: Point) => {
    const handle = tool === 'select' ? hitHandle(screenToWorld(screen, camera)) : null
    const next = handle ? handleCursors[handle] : null
    if (next !== hoverCursor) setHoverCursor(next)
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const screen = toScreen(event)
    if (!pointers.current.has(event.pointerId)) {
      updateHoverCursor(screen)
      return
    }
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
        // Measured from the start so grid snapping lands the selection's corner exactly on the grid.
        const dx = snap(current.startBounds.minX + world.x - current.start.x) - current.startBounds.minX
        const dy = snap(current.startBounds.minY + world.y - current.start.y) - current.startBounds.minY
        const moving = new Set(current.originals.keys())
        history.update((all) =>
          updateBindings(
            all.map((element) => {
              const original = current.originals.get(element.id)
              if (!original) return element
              const moved = translate(original, dx, dy)
              return moved.type === 'line' || moved.type === 'arrow' ? detachFromStaticShapes(moved, moving) : moved
            }),
          ),
        )
        return
      }
      case 'resize': {
        const next = resizeBounds(current.startBounds, current.handle, snapPoint(world), event.shiftKey)
        history.update((all) =>
          updateBindings(
            all.map((element) => {
              const original = current.originals.get(element.id)
              return original ? scaleElement(original, current.startBounds, next) : element
            }),
          ),
        )
        return
      }
      case 'create': {
        const point = snapPoint(world)
        history.update((all) =>
          all.map((element) => {
            if (element.id !== current.id) return element
            if (element.type === 'line' || element.type === 'arrow') return { ...element, points: [element.points[0], point] }
            if (element.type === 'rectangle' || element.type === 'diamond' || element.type === 'ellipse') {
              return resizeFromOrigin(element, current.origin, point, event.shiftKey)
            }
            return element
          }),
        )
        return
      }
      case 'draw': {
        // Skip points closer than a pixel apart to keep strokes light.
        if (distance(world, current.last) < 1 / camera.zoom) return
        // Pens report real pressure; for mouse and touch, faster movement draws thinner.
        const target = event.pointerType === 'pen' ? event.pressure : Math.min(1, Math.max(0.3, 1.15 - distance(screen, current.lastScreen) / 30))
        const pressure = current.pressure * 0.6 + target * 0.4
        current.last = world
        current.lastScreen = screen
        current.pressure = pressure
        history.update((all) => all.map((element) => (element.id === current.id && element.type === 'freedraw' ? { ...element, points: [...element.points, { ...world, p: pressure }] } : element)))
        return
      }
      case 'erase':
        eraseAt(world)
        return
      case 'laser':
        laserTrail.current.push({ point: world, time: performance.now() })
        return
      case 'marquee': {
        const box = boundsFromPoints(current.origin, world)
        setMarquee(box)
        const inside = elements.filter((element) => !element.locked && boundsContain(box, getBounds(element))).map((element) => element.id)
        onSelectionChange(new Set([...current.base, ...expandGroups(elements, new Set(inside))]))
        return
      }
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
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
        history.update((all) => {
          const finalized = all.map((element) => (element.id === current.id ? finalizeCreated(element) : element))
          // Connector ends released over a shape attach to it.
          return bindNewConnector(finalized, current.id, HIT_TOLERANCE / camera.zoom)
        })
        history.commit()
        onSelectionChange(new Set([current.id]))
        finishCreation()
        return
      case 'draw':
      case 'move':
      case 'resize':
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
    const world = screenToWorld(toScreen(event), camera)
    const hit = hitTopmost(elements, world, HIT_TOLERANCE / camera.zoom)
    if (hit?.type === 'sticky' || hit?.type === 'text') {
      if (!hit.locked) onEditText(hit.id)
    } else if (!hit) {
      addTextAt(snapPoint(world))
    }
  }

  const handleContextMenu = (event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const screen = toScreen(event)
    const world = screenToWorld(screen, camera)
    const hit = hitTopmost(elements, world, HIT_TOLERANCE / camera.zoom)
    if (hit && !selectedIds.has(hit.id)) onSelectionChange(expandGroups(elements, new Set([hit.id])))
    if (!hit) onSelectionChange(new Set())
    onContextMenu({ x: event.clientX, y: event.clientY }, world)
  }

  const handleDragOver = (event: DragEvent<HTMLCanvasElement>) => {
    const types = event.dataTransfer.types
    if (!types.includes(LIBRARY_DRAG_TYPE) && !types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (event: DragEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(toScreen(event), camera)
    const itemId = event.dataTransfer.getData(LIBRARY_DRAG_TYPE)
    if (itemId) {
      event.preventDefault()
      onLibraryDrop(itemId, world)
      return
    }
    const images = [...event.dataTransfer.files].filter(isAcceptedImage)
    if (images.length > 0) {
      event.preventDefault()
      onImageDrop(images, world)
    }
  }

  const cursor = panning
    ? 'grabbing'
    : tool === 'hand' || spaceHeld
      ? 'grab'
      : tool === 'select'
        ? (hoverCursor ?? 'default')
        : tool === 'text'
          ? 'text'
          : 'crosshair'

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label="Whiteboard canvas"
        className="absolute inset-0 size-full touch-none"
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      <canvas ref={laserCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
    </>
  )
}
