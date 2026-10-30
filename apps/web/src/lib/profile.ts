import type { ElementStyle } from '@/lib/board/types'

/*
 * The person using the app. Accounts are not connected to a server yet, so
 * the profile lives in this browser's localStorage.
 */

export type InkDynamics = 'vector' | 'architectural' | 'charcoal'

export type Profile = {
  name: string
  email: string
  handle: string
  role: string
  /** Small JPEG data URL, or null for initials. */
  avatar: string | null
  cursorColor: string
  ink: InkDynamics
  /** When the profile was last saved, or null if never. */
  savedAt: number | null
}

const PROFILE_KEY = 'sketchsync:profile'
const DATA_PREFIX = 'sketchsync:'

export const defaultProfile: Profile = {
  name: 'Teslim Balogun',
  email: 'teslim@sketchsync.dev',
  handle: 'teslim_baloo',
  role: 'Staff Systems Architect',
  avatar: null,
  cursorColor: '#4f46e5',
  ink: 'architectural',
  savedAt: null,
}

/** How each ink setting changes the pencil's default style. */
export const inkStyles: Record<InkDynamics, Partial<ElementStyle>> = {
  vector: { pressure: false, strokeWidth: 2 },
  architectural: { pressure: true, strokeWidth: 2 },
  charcoal: { pressure: true, strokeWidth: 4 },
}

const listeners = new Set<() => void>()
let cache: Profile | null = null

export function getProfile(): Profile {
  if (cache) return cache
  try {
    cache = { ...defaultProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') }
  } catch {
    cache = defaultProfile
  }
  return cache!
}

export function saveProfile(profile: Omit<Profile, 'savedAt'>) {
  cache = { ...profile, savedAt: Date.now() }
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full (e.g. a large avatar): the change still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeProfile(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PROFILE_KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

/** Remove every SketchSync board, library item and setting stored in this browser. */
export function wipeLocalData() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(DATA_PREFIX))
    .forEach((key) => localStorage.removeItem(key))
  cache = null
}

/** Downscale an image file to a square JPEG data URL suitable for storage. */
export async function avatarFromFile(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  // Centre-crop to a square.
  const side = Math.min(bitmap.width, bitmap.height)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}
