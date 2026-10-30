import { ArrowRight, Circle, Diamond, Eraser, Hand, Image, Minus, MousePointer2, Pencil, Square, StickyNote, Type, type LucideIcon } from 'lucide-react'
import type { Tool } from '@/lib/board/types'

export type ToolDefinition = {
  id: Tool
  label: string
  shortcut: string
  icon: LucideIcon
  /** Shown in the toolbar but not built yet. */
  comingSoon?: boolean
}

export const tools: ToolDefinition[] = [
  { id: 'hand', label: 'Hand', shortcut: 'H', icon: Hand },
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: Diamond },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowRight },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'pencil', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type, comingSoon: true },
  { id: 'sticky', label: 'Sticky note', shortcut: 'N', icon: StickyNote },
  { id: 'image', label: 'Image', shortcut: 'I', icon: Image, comingSoon: true },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
]

/** Tools that create elements; after one is used, the select tool comes back unless the toolbar is locked. */
export const creationTools = new Set<Tool>(['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'sticky'])
