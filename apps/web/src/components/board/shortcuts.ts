/** Keyboard shortcuts that are not tool keys, shared by the help page and the in-board dialog. */
export const generalShortcuts: [action: string, keys: string][] = [
  ['Undo / redo', 'Ctrl Z · Ctrl Shift Z'],
  ['Cut / copy / paste', 'Ctrl X · Ctrl C · Ctrl V'],
  ['Duplicate', 'Ctrl D'],
  ['Group / ungroup', 'Ctrl G · Ctrl Shift G'],
  ['Select all', 'Ctrl A'],
  ['Delete selection', 'Del'],
  ['Nudge selection', 'Arrow keys (Shift for 10px)'],
  ['Lock tool after drawing', 'Q'],
  ['Pan the canvas', 'Space + drag'],
  ['Zoom in / out / reset', 'Ctrl + · Ctrl − · Ctrl 0'],
  ['Zoom to fit / to selection', 'Shift 1 · Shift 2'],
  ['Toggle grid & snapping', "Ctrl '"],
  ['Board outline (screen readers)', 'Alt O'],
  ['Open / save diagram', 'Ctrl O · Ctrl S'],
  ['Show shortcuts', '?'],
]
