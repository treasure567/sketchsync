import {
  ArrowDownToLine,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  Eraser,
  FileImage,
  FileText,
  FolderOpen,
  Grid3x3,
  Group,
  ImagePlus,
  Keyboard,
  LayoutGrid,
  Library,
  ListTree,
  Lock,
  LockOpen,
  Save,
  Scan,
  Scissors,
  SquareDashedMousePointer,
  Trash2,
  Ungroup,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { BoardCanvas } from '@/components/board/BoardCanvas'
import { BoardControls, BoardStatus, CanvasHint } from '@/components/board/BoardControls'
import { BoardHeader } from '@/components/board/BoardHeader'
import { LibraryPanel } from '@/components/board/LibraryPanel'
import { Minimap } from '@/components/board/Minimap'
import { OutlinePanel } from '@/components/board/OutlinePanel'
import { ShareDialog } from '@/components/board/ShareDialog'
import { ShortcutsDialog } from '@/components/board/ShortcutsDialog'
import { StylePanel } from '@/components/board/StylePanel'
import { TextEditor } from '@/components/board/TextEditor'
import { Toolbar } from '@/components/board/Toolbar'
import { tools } from '@/components/board/tools'
import { WelcomeOverlay } from '@/components/board/WelcomeOverlay'
import { Menu, type MenuEntry } from '@/components/ui/Menu'
import { useBoardHistory } from '@/hooks/useBoardHistory'
import { useProfile } from '@/hooks/useProfile'
import {
  alignElements,
  applyStyle,
  deleteElements,
  distributeElements,
  duplicateElements,
  expandGroups,
  groupElements,
  nudgeElements,
  reorder,
  setLocked,
  ungroupElements,
  type Alignment,
  type LayerMove,
} from '@/lib/board/actions'
import { copyToClipboard, hasClipboardContent, pasteFromClipboard } from '@/lib/board/clipboard'
import { createImage, createSticky, DEFAULT_FONT_SIZE, DEFAULT_STYLE, withText } from '@/lib/board/elements'
import { downloadBlob, exportPdf, exportPng, exportSvg } from '@/lib/board/export'
import { cameraToFit, screenToWorld, unionBounds, zoomAt } from '@/lib/board/geometry'
import { ACCEPTED_IMAGE_TYPES, isAcceptedImage, prepareImage } from '@/lib/board/images'
import { builtInItems, createUserItem, instantiate, loadUserItems, saveUserItems, type LibraryItem } from '@/lib/board/library'
import { readBoardFile, serializeBoard } from '@/lib/board/storage'
import type { BoardElement, Camera, ElementStyle, ElementType, Point, Tool } from '@/lib/board/types'
import { inkStyles } from '@/lib/profile'
import { loadBoardElements, saveBoardElements, updateBoard, type BoardMeta, type ShareSettings } from '@/lib/boards/store'

const AUTOSAVE_DELAY = 400
const ZOOM_STEP = 1.2
/** Grid spacing in world units when the grid is on. */
const GRID_SIZE = 24

const toolElementType: Partial<Record<Tool, ElementType>> = {
  rectangle: 'rectangle',
  diamond: 'diamond',
  ellipse: 'ellipse',
  arrow: 'arrow',
  line: 'line',
  pencil: 'freedraw',
  text: 'text',
  sticky: 'sticky',
}

const typeLabels: Record<ElementType, string> = {
  rectangle: 'Rectangle',
  diamond: 'Diamond',
  ellipse: 'Ellipse',
  arrow: 'Arrow',
  line: 'Line',
  freedraw: 'Drawing',
  text: 'Text',
  sticky: 'Sticky note',
  image: 'Image',
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

const fileName = (name: string, extension: string) => `${name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'board'}.${extension}`

/** One open board: canvas, tools, panels and dialogs. Changes autosave to this browser. */
export function BoardEditor({ board }: { board: BoardMeta }) {
  const navigate = useNavigate()
  const viewport = useViewportSize()
  const profile = useProfile()
  const history = useBoardHistory(() => loadBoardElements(board.id))
  const { elements, canUndo, canRedo, undo, redo, apply } = history

  const [camera, setCamera] = useState<Camera>(() => {
    const bounds = unionBounds(elements)
    return bounds ? cameraToFit(bounds, window.innerWidth, window.innerHeight, 120) : { x: -window.innerWidth / 2, y: -window.innerHeight / 2, zoom: 1 }
  })
  const [tool, setTool] = useState<Tool>('select')
  const [currentStyle, setCurrentStyle] = useState<ElementStyle>(() => ({ ...DEFAULT_STYLE, ...inkStyles[profile.ink] }))
  const [locked, setToolLocked] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ screen: Point; world: Point } | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [minimapOpen, setMinimapOpen] = useState(() => window.innerWidth >= 768)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [userItems, setUserItems] = useState(loadUserItems)
  const [savedElements, setSavedElements] = useState(elements)
  const [gridOn, setGridOn] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [textSize, setTextSize] = useState(DEFAULT_FONT_SIZE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => elements.filter((element) => selectedIds.has(element.id)), [elements, selectedIds])
  const viewportCenter = useCallback(() => screenToWorld({ x: viewport.width / 2, y: viewport.height / 2 }, camera), [camera, viewport])

  // Record that the board was opened, for the dashboard's Recent list.
  useEffect(() => {
    updateBoard(board.id, { openedAt: Date.now() })
  }, [board.id])

  // Autosave shortly after the last change, and straight away if the page is closed.
  const latestElements = useRef(elements)
  useEffect(() => {
    latestElements.current = elements
    if (elements === savedElements) return
    const timer = setTimeout(() => {
      saveBoardElements(board.id, elements)
      setSavedElements(elements)
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [board.id, elements, savedElements])

  useEffect(() => {
    const flush = () => saveBoardElements(board.id, latestElements.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [board.id])

  // ---------- Actions ----------

  const select = (ids: Iterable<string>) => setSelectedIds(new Set(ids))

  const addElements = useCallback(
    (added: BoardElement[]) => {
      if (added.length === 0) return
      apply((current) => [...current, ...added])
      setSelectedIds(new Set(added.map((element) => element.id)))
      setTool('select')
    },
    [apply],
  )

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    apply((current) => deleteElements(current, selectedIds))
    setSelectedIds(new Set())
  }, [apply, selectedIds])

  const duplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    const { elements: next, copyIds } = duplicateElements(elements, selectedIds)
    apply(() => next)
    setSelectedIds(copyIds)
  }, [apply, elements, selectedIds])

  const copySelected = useCallback(() => {
    if (selected.length > 0) copyToClipboard(selected)
  }, [selected])

  const cutSelected = useCallback(() => {
    copySelected()
    deleteSelected()
  }, [copySelected, deleteSelected])

  const paste = useCallback((at?: Point) => addElements(pasteFromClipboard(at ?? viewportCenter())), [addElements, viewportCenter])

  const moveLayer = (move: LayerMove) => apply((current) => reorder(current, selectedIds, move))

  const allSelectedLocked = selected.length > 0 && selected.every((element) => element.locked)
  const toggleElementLock = () => apply((current) => setLocked(current, selectedIds, !allSelectedLocked))

  const changeStyle = (patch: Partial<ElementStyle>) => {
    setCurrentStyle((style) => ({ ...style, ...patch }))
    if (selectedIds.size > 0) apply((current) => applyStyle(current, selectedIds, patch))
  }

  const addSelectionToLibrary = () => {
    if (selected.length === 0) return
    const name = selected.length === 1 ? typeLabels[selected[0].type] : `${selected.length} elements`
    const items = [createUserItem(selected, name), ...userItems]
    setUserItems(items)
    saveUserItems(items)
    setLibraryOpen(true)
  }

  const removeLibraryItem = (item: LibraryItem) => {
    const items = userItems.filter((entry) => entry.id !== item.id)
    setUserItems(items)
    saveUserItems(items)
  }

  const findLibraryItem = (id: string) => [...userItems, ...builtInItems].find((item) => item.id === id)

  const zoomBy = useCallback((factor: number) => setCamera((current) => zoomAt(current, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, current.zoom * factor)), [])
  const resetZoom = useCallback(() => setCamera((current) => zoomAt(current, { x: window.innerWidth / 2, y: window.innerHeight / 2 }, 1)), [])

  const fitCamera = useCallback((target: BoardElement[]) => {
    const bounds = unionBounds(target)
    if (bounds) setCamera(cameraToFit(bounds, window.innerWidth, window.innerHeight, 120, 2))
  }, [])
  const zoomToFit = useCallback(() => fitCamera(elements), [elements, fitCamera])
  const zoomToSelection = useCallback(() => fitCamera(selected.length > 0 ? selected : elements), [elements, fitCamera, selected])

  const selectedGroupId = selected[0]?.groupId
  const selectionIsOneGroup = !!selectedGroupId && selected.every((element) => element.groupId === selectedGroupId)
  const groupSelected = useCallback(() => {
    if (selectedIds.size > 1) apply((current) => groupElements(current, selectedIds))
  }, [apply, selectedIds])
  const ungroupSelected = useCallback(() => apply((current) => ungroupElements(current, selectedIds)), [apply, selectedIds])

  const align = (alignment: Alignment) => apply((current) => alignElements(current, selectedIds, alignment))
  const distribute = (axis: 'horizontal' | 'vertical') => apply((current) => distributeElements(current, selectedIds, axis))

  const changeTextSize = (size: number) => {
    setTextSize(size)
    if (selectedIds.size === 0) return
    apply((current) => current.map((element) => (selectedIds.has(element.id) && element.type === 'text' ? withText({ ...element, fontSize: size }, element.text) : element)))
  }

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (selectedIds.size > 0) apply((current) => nudgeElements(current, selectedIds, dx, dy))
    },
    [apply, selectedIds],
  )

  /** Add images centred on `at` (or the view), downscaled for storage. */
  const insertImages = useCallback(
    async (files: File[], at?: Point) => {
      const center = at ?? viewportCenter()
      const added: BoardElement[] = []
      for (const [index, file] of files.entries()) {
        try {
          const { src, width, height } = await prepareImage(file)
          added.push(createImage({ x: center.x + index * 24, y: center.y + index * 24 }, src, width, height))
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'That image could not be added.')
        }
      }
      addElements(added)
    },
    [addElements, viewportCenter],
  )

  const handleImageChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].filter(isAcceptedImage)
    event.target.value = ''
    if (files.length > 0) insertImages(files)
  }

  /** Switch tools; the image tool opens a file picker instead of staying active. */
  const selectTool = useCallback((next: Tool) => {
    if (next === 'image') imageInputRef.current?.click()
    else setTool(next)
  }, [])

  const focusElement = (element: BoardElement) => {
    setSelectedIds(expandGroups(elements, new Set([element.id])))
    const bounds = unionBounds([element])
    if (bounds) setCamera(cameraToFit(bounds, window.innerWidth, window.innerHeight, 200, 1))
  }

  const openFile = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const loaded = await readBoardFile(file)
      apply(() => loaded)
      setSelectedIds(new Set())
      const bounds = unionBounds(loaded)
      if (bounds) setCamera(cameraToFit(bounds, window.innerWidth, window.innerHeight, 120))
    } catch {
      window.alert('That file could not be opened. Choose a SketchSync diagram (.json).')
    }
  }

  const saveToFile = useCallback(() => {
    downloadBlob(new Blob([serializeBoard(elements)], { type: 'application/json' }), fileName(board.name, 'sketchsync.json'))
  }, [board.name, elements])

  const exportAs = async (format: 'png' | 'svg' | 'pdf') => {
    if (elements.length === 0) {
      window.alert('Draw something first — there is nothing to export yet.')
      return
    }
    const blob = format === 'png' ? await exportPng(elements, 2) : format === 'svg' ? exportSvg(elements) : await exportPdf(elements)
    downloadBlob(blob, fileName(board.name, format))
  }

  const clearCanvas = () => {
    if (elements.length === 0 || !window.confirm('Clear the whole board? You can undo this.')) return
    apply(() => [])
    setSelectedIds(new Set())
  }

  const dropSticky = () => {
    const sticky = createSticky(viewportCenter(), currentStyle.fill === 'transparent' ? currentStyle : DEFAULT_STYLE)
    apply((current) => [...current, sticky])
    select([sticky.id])
    setEditingId(sticky.id)
  }

  const commitText = (id: string, text: string) => {
    apply((current) => {
      const element = current.find((entry) => entry.id === id)
      if (!element || (element.type !== 'text' && element.type !== 'sticky')) return current
      // Empty text elements are removed rather than left invisible.
      if (element.type === 'text' && !text.trim()) return current.filter((entry) => entry.id !== id)
      if (element.text === text) return current
      return current.map((entry) => (entry.id === id ? (element.type === 'text' ? withText(element, text) : { ...element, text }) : entry))
    })
    setEditingId(null)
  }

  const updateShare = (share: ShareSettings) => updateBoard(board.id, { share })

  // ---------- Keyboard ----------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('dialog[open]')) return
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
          case 'c':
            copySelected()
            break
          case 'x':
            cutSelected()
            break
          case 'g':
            if (event.shiftKey) ungroupSelected()
            else groupSelected()
            break
          case "'":
            setGridOn((on) => !on)
            break
          case 'd':
            duplicateSelected()
            break
          case 'a':
            select(elements.filter((element) => !element.locked).map((element) => element.id))
            break
          case 'o':
            openFile()
            break
          case 's':
            saveToFile()
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
      if (event.altKey) {
        if (event.code === 'KeyO') {
          event.preventDefault()
          setOutlineOpen((open) => !open)
        }
        return
      }

      if (event.shiftKey && event.code === 'Digit1') return zoomToFit()
      if (event.shiftKey && event.code === 'Digit2') return zoomToSelection()

      const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }
      if (arrows[key] && selectedIds.size > 0) {
        event.preventDefault()
        const step = gridOn ? GRID_SIZE : event.shiftKey ? 10 : 1
        nudge(arrows[key][0] * step, arrows[key][1] * step)
        return
      }

      if (key === 'delete' || key === 'backspace') return deleteSelected()
      if (key === '?') return setShortcutsOpen(true)
      if (key === 'escape') {
        setSelectedIds(new Set())
        setTool('select')
        return
      }
      if (key === 'q') return setToolLocked((value) => !value)
      const shortcut = tools.find(({ shortcut: toolKey, comingSoon }) => !comingSoon && toolKey.toLowerCase() === key)
      if (shortcut) selectTool(shortcut.id)
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
  }, [copySelected, cutSelected, deleteSelected, duplicateSelected, elements, gridOn, groupSelected, nudge, openFile, redo, resetZoom, saveToFile, selectTool, selectedIds, undo, ungroupSelected, zoomBy, zoomToFit, zoomToSelection])

  // Paste: images from the system clipboard become image elements; otherwise paste copied board elements.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('dialog[open]')) return
      event.preventDefault()
      const images = [...(event.clipboardData?.files ?? [])].filter(isAcceptedImage)
      if (images.length > 0) insertImages(images)
      else paste()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [insertImages, paste])

  // ---------- Menus ----------

  const mainMenu: MenuEntry[] = [
    { label: 'Back to dashboard', icon: LayoutGrid, onSelect: () => navigate('/dashboard') },
    'separator',
    { label: 'Open diagram…', icon: FolderOpen, shortcut: 'Ctrl O', onSelect: openFile },
    { label: 'Save to file', icon: Save, shortcut: 'Ctrl S', onSelect: saveToFile },
    { label: 'Export PNG (2×)', icon: FileImage, onSelect: () => exportAs('png') },
    { label: 'Export SVG', icon: Download, onSelect: () => exportAs('svg') },
    { label: 'Export PDF', icon: FileText, onSelect: () => exportAs('pdf') },
    'separator',
    { label: 'Insert image…', icon: ImagePlus, shortcut: 'I', onSelect: () => selectTool('image') },
    { label: 'Zoom to fit', icon: Scan, shortcut: 'Shift 1', onSelect: zoomToFit },
    { label: 'Show grid & snap', icon: Grid3x3, shortcut: "Ctrl '", checked: gridOn, onSelect: () => setGridOn((on) => !on) },
    { label: 'Board outline', icon: ListTree, shortcut: 'Alt O', checked: outlineOpen, onSelect: () => setOutlineOpen((open) => !open) },
    'separator',
    { label: 'Keyboard shortcuts & help', icon: Keyboard, shortcut: '?', onSelect: () => setShortcutsOpen(true) },
    'separator',
    { label: 'Clear canvas', icon: Eraser, danger: true, onSelect: clearCanvas },
  ]

  const contextMenuItems: MenuEntry[] =
    selected.length > 0
      ? [
          { label: 'Cut', icon: Scissors, shortcut: 'Ctrl X', onSelect: cutSelected },
          { label: 'Copy', icon: Copy, shortcut: 'Ctrl C', onSelect: copySelected },
          { label: 'Paste', icon: ClipboardPaste, shortcut: 'Ctrl V', onSelect: () => paste(contextMenu?.world), disabled: !hasClipboardContent() },
          { label: 'Duplicate', icon: CopyPlus, shortcut: 'Ctrl D', onSelect: duplicateSelected },
          ...(selectionIsOneGroup
            ? [{ label: 'Ungroup', icon: Ungroup, shortcut: 'Ctrl Shift G', onSelect: ungroupSelected }]
            : selected.length > 1
              ? [{ label: 'Group', icon: Group, shortcut: 'Ctrl G', onSelect: groupSelected }]
              : []),
          'separator',
          { label: 'Bring to front', icon: ArrowUpToLine, onSelect: () => moveLayer('front') },
          { label: 'Send to back', icon: ArrowDownToLine, onSelect: () => moveLayer('back') },
          'separator',
          { label: 'Add to library', icon: Library, onSelect: addSelectionToLibrary },
          { label: allSelectedLocked ? 'Unlock' : 'Lock', icon: allSelectedLocked ? LockOpen : Lock, onSelect: toggleElementLock },
          'separator',
          { label: 'Delete', icon: Trash2, shortcut: 'Del', danger: true, onSelect: deleteSelected },
        ]
      : [
          { label: 'Paste', icon: ClipboardPaste, shortcut: 'Ctrl V', onSelect: () => paste(contextMenu?.world), disabled: !hasClipboardContent() },
          { label: 'Select all', icon: SquareDashedMousePointer, shortcut: 'Ctrl A', onSelect: () => select(elements.filter((element) => !element.locked).map((element) => element.id)) },
          'separator',
          { label: 'Keyboard shortcuts & help', icon: Keyboard, shortcut: '?', onSelect: () => setShortcutsOpen(true) },
        ]

  // ---------- Style panel ----------

  const panelTypes = new Set<ElementType>(selected.length > 0 ? selected.map((element) => element.type) : toolElementType[tool] ? [toolElementType[tool]!] : [])
  const panelStyle = selected[0]?.style ?? currentStyle
  const panelTitle = selected.length > 1 ? `${selected.length} elements` : selected.length === 1 ? typeLabels[selected[0].type] : (tools.find((entry) => entry.id === tool)?.label ?? '')

  const editing = elements.find((element) => element.id === editingId)
  const activeTool = tools.find((entry) => entry.id === tool)
  const hint = tool === 'select' && elements.length === 0 ? undefined : activeTool?.hint

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-white select-none">
      <BoardCanvas
        elements={elements}
        camera={camera}
        onCameraChange={setCamera}
        tool={tool}
        onToolChange={setTool}
        currentStyle={currentStyle}
        currentFontSize={textSize}
        selectionColor={profile.cursorColor}
        gridSize={gridOn ? GRID_SIZE : 0}
        onImageDrop={(files, world) => insertImages(files, world)}
        locked={locked}
        spaceHeld={spaceHeld}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        editingId={editingId}
        onEditText={setEditingId}
        onContextMenu={(screen, world) => setContextMenu({ screen, world })}
        onLibraryDrop={(itemId, world) => {
          const item = findLibraryItem(itemId)
          if (item) addElements(instantiate(item, world))
        }}
        history={history}
      />

      {elements.length === 0 && !editingId && tool === 'select' && (
        <WelcomeOverlay onOpenFile={openFile} onDropSticky={dropSticky} onStartSession={() => setShareOpen(true)} onShowShortcuts={() => setShortcutsOpen(true)} />
      )}

      {(editing?.type === 'sticky' || editing?.type === 'text') && (
        <TextEditor key={editing.id} element={editing} camera={camera} onCommit={(text) => commitText(editing.id, text)} />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-4">
        <BoardHeader
          title={board.name}
          onRename={(name) => updateBoard(board.id, { name })}
          saveStatus={elements === savedElements ? 'saved' : 'saving'}
          menuItems={mainMenu}
          libraryOpen={libraryOpen}
          onToggleLibrary={() => setLibraryOpen((open) => !open)}
          shareCount={board.share.invites.length}
          onShare={() => setShareOpen(true)}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-2 px-3 lg:top-3 lg:px-0">
        <Toolbar tool={tool} locked={locked} onToolChange={selectTool} onToggleLock={() => setToolLocked((value) => !value)} className="pointer-events-auto max-w-full" />
        <div className="max-md:hidden">
          <CanvasHint hint={hint} />
        </div>
      </div>

      {panelTypes.size > 0 && (
        <StylePanel
          title={panelTitle}
          types={panelTypes}
          style={panelStyle}
          onStyleChange={changeStyle}
          onHelp={() => setShortcutsOpen(true)}
          fontSize={panelTypes.has('text') ? { value: selected.find((element) => element.type === 'text')?.fontSize ?? textSize, onChange: changeTextSize } : undefined}
          selection={
            selected.length > 0
              ? {
                  count: selected.length,
                  grouped: selectionIsOneGroup,
                  locked: allSelectedLocked,
                  onAlign: align,
                  onDistribute: distribute,
                  onToggleGroup: selectionIsOneGroup ? ungroupSelected : groupSelected,
                  onLayer: moveLayer,
                  onDuplicate: duplicateSelected,
                  onToggleLock: toggleElementLock,
                  onAddToLibrary: addSelectionToLibrary,
                  onDelete: deleteSelected,
                }
              : undefined
          }
          className={
            selected.length > 0
              ? 'absolute inset-x-3 bottom-16 max-h-[38vh] overflow-y-auto md:inset-x-auto md:top-28 md:bottom-auto md:left-4 md:max-h-[calc(100%-11rem)] md:w-60'
              : 'absolute top-28 left-4 max-h-[calc(100%-11rem)] w-60 overflow-y-auto max-md:hidden'
          }
        />
      )}

      {outlineOpen && (
        <div className="pointer-events-none absolute top-16 bottom-16 left-3 w-80 max-w-[calc(100%-1.5rem)] sm:left-4">
          <OutlinePanel
            elements={elements}
            selectedIds={selectedIds}
            onSelect={(id) => setSelectedIds(expandGroups(elements, new Set([id])))}
            onFocus={focusElement}
            onDelete={(id) => apply((current) => deleteElements(current, new Set([id])))}
            onClose={() => setOutlineOpen(false)}
          />
        </div>
      )}

      {libraryOpen && (
        <div className="pointer-events-none absolute top-16 right-3 bottom-16 w-80 max-w-[calc(100%-1.5rem)] sm:right-4">
          <LibraryPanel
            userItems={userItems}
            canAddSelection={selected.length > 0}
            onAddSelection={addSelectionToLibrary}
            onInsert={(item) => addElements(instantiate(item, viewportCenter()))}
            onRemove={removeLibraryItem}
            onClose={() => setLibraryOpen(false)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
        <BoardControls
          zoom={camera.zoom}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          onResetZoom={resetZoom}
          onZoomToFit={zoomToFit}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3 flex flex-col items-end gap-2 sm:right-4 sm:bottom-4">
        {minimapOpen && !libraryOpen && (
          <div className="max-md:hidden">
            <Minimap
              elements={elements}
              camera={camera}
              viewport={viewport}
              onNavigate={(center) => setCamera((current) => ({ ...current, x: center.x - viewport.width / 2 / current.zoom, y: center.y - viewport.height / 2 / current.zoom }))}
              onClose={() => setMinimapOpen(false)}
            />
          </div>
        )}
        <BoardStatus minimapOpen={minimapOpen} onToggleMinimap={() => setMinimapOpen((open) => !open)} onHelp={() => setShortcutsOpen(true)} />
      </div>

      {contextMenu && (
        <Menu
          label="Element actions"
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
          className="fixed"
          style={{ left: Math.min(contextMenu.screen.x, viewport.width - 220), top: Math.min(contextMenu.screen.y, viewport.height - 380) }}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {shareOpen && <ShareDialog board={board} onChange={updateShare} onClose={() => setShareOpen(false)} />}

      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChosen} />
      <input ref={imageInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} multiple className="hidden" onChange={handleImageChosen} />
    </div>
  )
}
