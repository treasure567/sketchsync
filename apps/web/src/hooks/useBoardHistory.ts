import { useCallback, useMemo, useReducer } from 'react'
import type { BoardElement } from '@/lib/board/types'

const HISTORY_LIMIT = 100

type Elements = BoardElement[]
type Updater = (elements: Elements) => Elements

type State = {
  past: Elements[]
  present: Elements
  future: Elements[]
  /** Elements as they were when the current gesture began. */
  checkpoint: Elements | null
}

type Action =
  | { type: 'begin' }
  | { type: 'update'; updater: Updater }
  | { type: 'commit' }
  | { type: 'apply'; updater: Updater }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; elements: Elements }

function pushPast(past: Elements[], elements: Elements) {
  return [...past, elements].slice(-HISTORY_LIMIT)
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'begin':
      return { ...state, checkpoint: state.present }
    case 'update':
      return { ...state, present: action.updater(state.present) }
    case 'commit':
      if (!state.checkpoint || state.checkpoint === state.present) return { ...state, checkpoint: null }
      return { past: pushPast(state.past, state.checkpoint), present: state.present, future: [], checkpoint: null }
    case 'apply': {
      const next = action.updater(state.present)
      if (next === state.present) return state
      return { past: pushPast(state.past, state.present), present: next, future: [], checkpoint: null }
    }
    case 'undo': {
      if (state.past.length === 0) return state
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future], checkpoint: null }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      return { past: pushPast(state.past, state.present), present: state.future[0], future: state.future.slice(1), checkpoint: null }
    }
    case 'load':
      return { past: [], present: action.elements, future: [], checkpoint: null }
  }
}

/**
 * Board elements with undo and redo. A gesture (begin, many updates,
 * commit) becomes one undo step; apply() is a single-step change.
 */
export function useBoardHistory(init: () => Elements) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ past: [], present: init(), future: [], checkpoint: null }))

  const begin = useCallback(() => dispatch({ type: 'begin' }), [])
  const update = useCallback((updater: Updater) => dispatch({ type: 'update', updater }), [])
  const commit = useCallback(() => dispatch({ type: 'commit' }), [])
  const apply = useCallback((updater: Updater) => dispatch({ type: 'apply', updater }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const load = useCallback((elements: Elements) => dispatch({ type: 'load', elements }), [])

  const actions = useMemo(() => ({ begin, update, commit, apply, undo, redo, load }), [begin, update, commit, apply, undo, redo, load])

  return {
    elements: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    ...actions,
  }
}

export type BoardHistory = ReturnType<typeof useBoardHistory>
