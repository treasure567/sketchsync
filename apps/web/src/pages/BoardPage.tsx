import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { BoardControls, CanvasHint } from '@/components/board/BoardControls'
import { BoardHeader } from '@/components/board/BoardHeader'
import { StickyEditor } from '@/components/board/StickyEditor'
import { Toolbar } from '@/components/board/Toolbar'
import { tools } from '@/components/board/tools'
import { WelcomeOverlay } from '@/components/board/WelcomeOverlay'
import { useBoardHistory } from '@/hooks/useBoardHistory'
import { createSticky } from '@/lib/board/elements'
import { screenToWorld, zoomAt } from '@/lib/board/geometry'
import { loadLocalBoard, readBoardFile, saveLocalBoard } from '@/lib/board/storage'
import type { Camera, Tool } from '@/lib/board/types'

const AUTOSAVE_DELAY = 400
const ZOOM_STEP = 1.2

const viewportCenter = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

/*
 * A single board kept in this browser. Sharing and real-time sync come later;
 * for now the board autosaves to local storage.
 */
export function BoardPage() {
  const history = useBoardHistory(loadLocalBoard)
  const { elements, canUndo, canRedo, undo, redo, apply } = history
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [locked, setLocked] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savedElements, setSavedElements] = useState(elements)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Autosave shortly after the last change, and straight away if the page is closed.
  const latestElements = useRef(elements)
  useEffect(() => {
    latestElements.current = elements
    if (elements === savedElements) return
    const timer = setTimeout(() => {
      saveLocalBoard(elements)
      setSavedElements(elements)
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [elements, savedElements])

  useEffect(() => {
    const flush = () => saveLocalBoard(latestElements.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  const zoomBy = useCallback((factor: number) => setCamera((current) => zoomAt(current, viewportCenter(), current.zoom * factor)), [])
  const resetZoom = useCallback(() => setCamera((current) => zoomAt(current, viewportCenter(), 1)), [])

  const openFile = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const loaded = await readBoardFile(file)
      apply(() => loaded)
      setSelectedIds(new Set())
    } catch {
      window.alert('That file could not be opened. Choose a SketchSync diagram (.json).')
    }
  }

  const dropSticky = useCallback(() => {
    const sticky = createSticky(screenToWorld(viewportCenter(), camera))
    apply((current) => [...current, sticky])
    setSelectedIds(new Set([sticky.id]))
    setEditingId(sticky.id)
  }, [apply, camera])

  const commitStickyText = (id: string, text: string) => {
    apply((current) => {
      const sticky = current.find((element) => element.id === id)
      if (sticky?.type !== 'sticky' || sticky.text === text) return current
      return current.map((element) => (element.id === id ? { ...sticky, text } : element))
    })
    setEditingId(null)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      const mod = event.ctrlKey || event.metaKey

      if (key === ' ') {
        event.preventDefault()
        if (!event.repeat) setSpaceHeld(true)
        return
      }

      if (mod) {
        switch (key) {
          case 'z':
            if (event.shiftKey) redo()
            else undo()
            break
          case 'y':
            redo()
            break
          case 'o':
            openFile()
            break
          case 'a':
            setSelectedIds(new Set(elements.map((element) => element.id)))
            break
          case '=':
          case '+':
            zoomBy(ZOOM_STEP)
            break
          case '-':
            zoomBy(1 / ZOOM_STEP)
            break
          case '0':
            resetZoom()
            break
          default:
            return
        }
        event.preventDefault()
        return
      }
      if (event.altKey) return

      if (key === 'delete' || key === 'backspace') {
        if (selectedIds.size === 0) return
        apply((current) => current.filter((element) => !selectedIds.has(element.id)))
        setSelectedIds(new Set())
        return
      }
      if (key === 'escape') {
        setSelectedIds(new Set())
        setTool('select')
        return
      }
      if (key === 'q') {
        setLocked((value) => !value)
        return
      }
      const shortcut = tools.find(({ shortcut: toolKey, comingSoon }) => !comingSoon && toolKey.toLowerCase() === key)
      if (shortcut) setTool(shortcut.id)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') setSpaceHeld(false)
    }
    const onBlur = () => setSpaceHeld(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [apply, elements, openFile, redo, resetZoom, selectedIds, undo, zoomBy])

  const editingSticky = elements.find((element) => element.id === editingId)

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-white select-none">
      <BoardCanvas
        elements={elements}
        camera={camera}
        onCameraChange={setCamera}
        tool={tool}
        onToolChange={setTool}
        locked={locked}
        spaceHeld={spaceHeld}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        editingId={editingId}
        onEditSticky={setEditingId}
        history={history}
      />

      {elements.length === 0 && <WelcomeOverlay onOpenFile={openFile} onDropSticky={dropSticky} />}

      {editingSticky?.type === 'sticky' && (
        <StickyEditor key={editingSticky.id} sticky={editingSticky} camera={camera} onCommit={(text) => commitStickyText(editingSticky.id, text)} />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-4">
        <BoardHeader title="Untitled Board" saveStatus={elements === savedElements ? 'saved' : 'saving'} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-2 px-3 lg:top-3 lg:px-0">
        <Toolbar
          tool={tool}
          locked={locked}
          onToolChange={setTool}
          onToggleLock={() => setLocked((value) => !value)}
          className="pointer-events-auto max-w-full"
        />
        <div className="max-md:hidden">
          <CanvasHint />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
        <BoardControls
          zoom={camera.zoom}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          onResetZoom={resetZoom}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChosen} />
    </div>
  )
}
