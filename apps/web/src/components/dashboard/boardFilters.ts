import { Clock, LayoutGrid, Star, Trash2, User, Users } from 'lucide-react'

export const boardFilters = [
  { id: 'all', label: 'All boards', icon: LayoutGrid },
  { id: 'mine', label: 'Created by me', icon: User },
  { id: 'shared', label: 'Shared with me', icon: Users },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
] as const

export type BoardFilter = (typeof boardFilters)[number]['id']
