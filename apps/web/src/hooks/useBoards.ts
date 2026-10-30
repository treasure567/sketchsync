import { useSyncExternalStore } from 'react'
import { listBoards, subscribeBoards } from '@/lib/boards/store'

/** All boards saved in this browser, kept up to date across tabs. */
export function useBoards() {
  return useSyncExternalStore(subscribeBoards, listBoards)
}
