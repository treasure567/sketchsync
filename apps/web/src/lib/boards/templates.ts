import { box, connector, label, note } from '@/lib/board/builders'
import type { BoardElement } from '@/lib/board/types'
import type { BoardType } from '@/lib/boards/store'

export type TemplateId = 'blank' | 'brainstorm' | 'lecture' | 'flowchart'

export type BoardTemplate = {
  id: TemplateId
  name: string
  type: BoardType
  build: () => BoardElement[]
}

export const templates: BoardTemplate[] = [
  { id: 'blank', name: 'Untitled Board', type: 'whiteboard', build: () => [] },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    type: 'whiteboard',
    build: () => [
      label('Brainstorm: what should we build next?', { x: 340, y: 40 }, 28),
      note({ x: 110, y: 200 }, '#fdf1c4', 'Dark mode?'),
      note({ x: 340, y: 200 }, '#fde1e7', 'Real-time presence'),
      note({ x: 570, y: 200 }, '#d9f5e8', 'Next steps ✓'),
      label('Vote with a dot ●', { x: 340, y: 330 }, 16, { stroke: '#8c8ca1' }),
    ],
  },
  {
    id: 'lecture',
    name: 'Lecture Notes',
    type: 'whiteboard',
    build: () => [
      label('Lecture notes', { x: 360, y: 30 }, 28),
      box('rectangle', 0, 80, 220, 380, { stroke: '#c9c4f5', rounded: false }),
      box('rectangle', 230, 80, 490, 380, { stroke: '#c9c4f5', rounded: false }),
      box('rectangle', 0, 470, 720, 130, { stroke: '#c9c4f5', rounded: false }),
      label('Cues & questions', { x: 110, y: 110 }, 16, { stroke: '#5b4cf5' }),
      label('Notes', { x: 475, y: 110 }, 16, { stroke: '#5b4cf5' }),
      label('Summary', { x: 360, y: 500 }, 16, { stroke: '#5b4cf5' }),
      label('Theorem 4.1: f(x) ≥ g(x)', { x: 475, y: 200 }, 18),
    ],
  },
  {
    id: 'flowchart',
    name: 'Flowchart & System',
    type: 'diagram',
    build: () => [
      box('rectangle', 0, 60, 160, 80, { fill: '#e4e0ff' }),
      label('Client', { x: 80, y: 100 }),
      connector('arrow', { x: 170, y: 100 }, { x: 270, y: 100 }),
      box('rectangle', 280, 60, 160, 80, { fill: '#e4e0ff' }),
      label('Gateway', { x: 360, y: 100 }),
      connector('arrow', { x: 450, y: 100 }, { x: 550, y: 100 }),
      box('diamond', 560, 40, 160, 120, { fill: '#fdf1c4' }),
      label('Authorised?', { x: 640, y: 100 }, 18),
      connector('arrow', { x: 640, y: 170 }, { x: 640, y: 250 }),
      box('rectangle', 560, 260, 160, 80, { fill: '#dcebe6' }),
      label('Service', { x: 640, y: 300 }),
    ],
  },
]

export function getTemplate(id: string | null | undefined) {
  return templates.find((template) => template.id === id) ?? templates[0]
}
