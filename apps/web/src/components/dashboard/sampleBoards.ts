export type BoardType = 'whiteboard' | 'wireframe' | 'diagram'
export type BoardRole = 'owner' | 'editor' | 'viewer'
export type BoardThumbnailKind = 'architecture' | 'checkout' | 'lecture' | 'sprint' | 'styleguide' | 'journey' | 'sync'

export type Board = {
  id: string
  name: string
  type: BoardType
  edited: string
  /** Initials of the people on the board. */
  collaborators: string[]
  /** Collaborators beyond the ones shown. */
  moreCollaborators?: number
  role: BoardRole
  starred: boolean
  /** People editing right now. */
  activeNow?: number
  /** Short note shown on the thumbnail, e.g. "42 sticky notes". */
  tag?: string
  thumbnail: BoardThumbnailKind
}

/** Placeholder boards until the dashboard loads real ones. */
export const sampleBoards: Board[] = [
  {
    id: 'q3-architecture',
    name: 'Q3 Distributed Systems Architecture',
    type: 'diagram',
    edited: 'Edited 2h ago',
    collaborators: ['AL', 'MV', 'CO'],
    moreCollaborators: 2,
    role: 'owner',
    starred: true,
    activeNow: 3,
    thumbnail: 'architecture',
  },
  {
    id: 'mobile-checkout',
    name: 'Mobile Checkout Flow',
    type: 'wireframe',
    edited: 'Edited 4h ago',
    collaborators: ['AL', 'ER'],
    role: 'editor',
    starred: false,
    activeNow: 2,
    thumbnail: 'checkout',
  },
  {
    id: 'cs244-lecture',
    name: 'CS244 Seminar Lecture',
    type: 'whiteboard',
    edited: 'Edited yesterday',
    collaborators: ['PK', 'AL'],
    role: 'editor',
    starred: false,
    thumbnail: 'lecture',
  },
  {
    id: 'design-sprint',
    name: 'Design Sprint 2025 Retro',
    type: 'whiteboard',
    edited: 'Edited 2 days ago',
    collaborators: ['AL', 'SC', 'LK', 'KT'],
    role: 'owner',
    starred: true,
    tag: '42 sticky notes',
    thumbnail: 'sprint',
  },
  {
    id: 'brand-styleguide',
    name: 'Brand Styleguide & Tokens',
    type: 'whiteboard',
    edited: 'Edited 3 days ago',
    collaborators: ['MV'],
    role: 'viewer',
    starred: false,
    thumbnail: 'styleguide',
  },
  {
    id: 'user-journey',
    name: 'User Journey & Onboarding',
    type: 'diagram',
    edited: 'Edited May 12',
    collaborators: ['AL', 'CO'],
    role: 'owner',
    starred: false,
    thumbnail: 'journey',
  },
  {
    id: 'multiplayer-engine',
    name: 'Multiplayer Engine Sync States',
    type: 'diagram',
    edited: 'Edited May 8',
    collaborators: ['AL'],
    role: 'owner',
    starred: false,
    thumbnail: 'sync',
  },
]
