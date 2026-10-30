import { box, connector, label, note } from '@/lib/board/builders'
import { cloneElements, newId, normalizeElements } from '@/lib/board/elements'
import { unionBounds } from '@/lib/board/geometry'
import type { BoardElement, Point } from '@/lib/board/types'

export const LIBRARY_DRAG_TYPE = 'application/x-sketchsync-library'

const LIBRARY_KEY = 'sketchsync:library'

export type LibraryItem = {
  id: string
  name: string
  category: string
  elements: BoardElement[]
  /** Built-in items ship with the app and cannot be removed. */
  builtIn?: boolean
}

export const builtInItems: LibraryItem[] = [
  {
    id: 'decision-diamond',
    name: 'Decision Diamond',
    category: 'Flowchart',
    builtIn: true,
    elements: [box('diamond', 0, 0, 140, 100, { stroke: '#5b4cf5', fill: '#f0eeff' }), label('Decision?', { x: 70, y: 50 }, 16)],
  },
  {
    id: 'service-container',
    name: 'Service Container',
    category: 'Architecture',
    builtIn: true,
    elements: [box('rectangle', 0, 0, 180, 90, { stroke: '#5b4cf5', fill: '#f0eeff' }), label('Service', { x: 90, y: 45 }, 18)],
  },
  {
    id: 'connector',
    name: 'Connector',
    category: 'Arrow',
    builtIn: true,
    elements: [connector('arrow', { x: 0, y: 60 }, { x: 160, y: 0 }, { stroke: '#1f6f5a' })],
  },
  {
    id: 'mobile-wireframe',
    name: 'Mobile Wireframe',
    category: 'Wireframe',
    builtIn: true,
    elements: [
      box('rectangle', 0, 0, 180, 320, { stroke: '#1f2433' }),
      box('rectangle', 20, 30, 140, 20, { stroke: 'transparent', fill: '#e4e0ff' }),
      box('rectangle', 20, 70, 140, 90, { stroke: '#c9c4f5', fill: '#f0eeff' }),
      box('rectangle', 20, 180, 100, 12, { stroke: 'transparent', fill: '#e5e5ee' }),
      box('rectangle', 20, 270, 140, 32, { stroke: 'transparent', fill: '#3e30c4' }),
    ],
  },
  {
    id: 'sticky-preset',
    name: 'Sticky Preset',
    category: 'Annotation',
    builtIn: true,
    elements: [note({ x: 100, y: 80 }, '#fdf1c4', 'Idea…')],
  },
  {
    id: 'uml-class',
    name: 'UML Class Box',
    category: 'Entities',
    builtIn: true,
    elements: [
      box('rectangle', 0, 0, 200, 150, { rounded: false }),
      label('User', { x: 100, y: 22 }, 18),
      connector('line', { x: 0, y: 44 }, { x: 200, y: 44 }),
      label('+ id: string\n+ email: string\n+ signIn()', { x: 100, y: 96 }, 15),
    ],
  },
]

export function loadUserItems(): LibraryItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored
      .filter((item) => typeof item?.id === 'string' && Array.isArray(item.elements))
      .map((item) => ({ ...item, elements: normalizeElements(item.elements) }))
  } catch {
    return []
  }
}

export function saveUserItems(items: LibraryItem[]) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items))
  } catch {
    // Library changes are best-effort.
  }
}

export function createUserItem(elements: BoardElement[], name: string): LibraryItem {
  return { id: newId(), name, category: 'Your item', elements: structuredClone(elements) }
}

/** Fresh copies of an item's elements, centred on `center`. */
export function instantiate(item: LibraryItem, center: Point): BoardElement[] {
  const bounds = unionBounds(item.elements)
  if (!bounds) return []
  const dx = center.x - (bounds.minX + bounds.maxX) / 2
  const dy = center.y - (bounds.minY + bounds.maxY) / 2
  return cloneElements(item.elements, dx, dy)
}
