import { ArrowRight, Circle, Diamond, Eraser, Hand, Image, Minus, MousePointer2, Pencil, Square, StickyNote, Type, Zap, type LucideIcon } from 'lucide-react'
import type { Tool } from '@/lib/board/types'

export type ToolDefinition = {
  id: Tool
  label: string
  shortcut: string
  icon: LucideIcon
  /** Shown under the toolbar while the tool is active. */
  hint: string
  /** Shown in the toolbar but not built yet. */
  comingSoon?: boolean
}

export const tools: ToolDefinition[] = [
  { id: 'hand', label: 'Hand', shortcut: 'H', icon: Hand, hint: 'Drag to move around the canvas' },
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2, hint: 'Selection mode · Drag to move, handles to resize, Shift keeps proportions' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square, hint: 'Click and drag to draw a rectangle · Shift for a square' },
  { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: Diamond, hint: 'Click and drag to draw a diamond · Shift for equal sides' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle, hint: 'Click and drag to draw an ellipse · Shift for a circle' },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowRight, hint: 'Click and drag to draw an arrow' },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus, hint: 'Click and drag to draw a line' },
  { id: 'pencil', label: 'Pencil', shortcut: 'P', icon: Pencil, hint: 'Click and drag, release when you’re finished' },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type, hint: 'Click anywhere to add text' },
  { id: 'sticky', label: 'Sticky note', shortcut: 'N', icon: StickyNote, hint: 'Click to place a sticky note' },
  { id: 'image', label: 'Image', shortcut: 'I', icon: Image, hint: 'Choose an image, or drop or paste one onto the board' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser, hint: 'Drag over elements to erase them' },
  { id: 'laser', label: 'Laser pointer', shortcut: 'K', icon: Zap, hint: 'Drag to point things out; the trail fades away and is not saved' },
]

/** Tools that create elements; after one is used, the select tool comes back unless the toolbar is locked. */
export const creationTools = new Set<Tool>(['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'text', 'sticky'])
