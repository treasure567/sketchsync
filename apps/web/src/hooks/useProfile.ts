import { useSyncExternalStore } from 'react'
import { getProfile, subscribeProfile } from '@/lib/profile'

/** The saved profile, kept up to date across tabs. */
export function useProfile() {
  return useSyncExternalStore(subscribeProfile, getProfile)
}
