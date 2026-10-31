# Phones: one-handed layout and palm rejection

## One-handed layout

The editor already put the tools at the bottom on phones. We moved the rest of what you need down there too, so you can draw holding the phone in one hand:

- **The ☰ main menu** now sits at the bottom, next to undo and redo, right above the tools. Before, it was in the top-left corner, the hardest place to reach with a thumb. (It goes back to the top only when there's no bottom bar, for example for view-only users.)
- **Every button the thumb uses is at least 44×44 px**: the tools, undo, redo, the menu, colour and style buttons, and menu items. They were 32 to 36 px.
- **Shape settings slide sideways.** When a shape is selected its colour and style buttons appear above the tools. If they don't fit, that row scrolls sideways (with a fade at the edge) so that undo, redo and the menu always stay on screen.
- At 375 px wide all eight main tools still fit in the bar: hand, select, draw, eraser, shapes, arrow, text and "more tools".

### Left- or right-handed

The most used tools (select and draw) and the ☰/undo/redo buttons sit on the side of the thumb you use:

- **Right-handed (default):** select and draw at the right end of the bar; ☰, undo and redo on the right.
- **Left-handed:** the bar is mirrored, with select and draw at the left; ☰, undo and redo on the left.

Switch it in **☰ → Left-handed layout** (only shown on phones). The choice is saved in the browser (`sketchsync-mobile-handedness`) and kept after a reload. The buttons are reordered in the page itself, not just on screen, so screen readers go through them in the order you see.

Laptop and tablet layouts are unchanged.

## Palm rejection and pen mode

The editor has a **pen mode** for drawing with a stylus:

- It **turns on by itself the first time a pen touches the board** (or a toolbar button). A pen-mode button then appears in the top-right so you can turn it off.
- In pen mode, **a single finger never draws**. Fingers still select (with the select tool), and two fingers move and zoom the board. So you can rest your hand on the screen between strokes.
- With the draw tool in pen mode, two fingers only move the board and don't zoom, so a resting hand can't zoom by accident.

**What we fixed:** if your palm touched the screen _while_ the pen was drawing, the editor treated it as a second finger. The stroke was cut short, and short strokes were thrown away completely; the palm's movement could also pan the board or move the line. Now, in pen mode, any touch that lands while the pen is down is ignored until the pen lifts. (iPads and many Android tablets also filter palms themselves; this covers the touches that still get through.)

## How it was tested

- Headless Chromium (Playwright) with a 375×812 touch phone, light and dark theme: measured every bottom button at 44×44, checked the menu opens upwards with 44 px rows, switched to left-handed and back, checked it survives a reload, and checked undo, redo and the menu stay on screen with a shape selected.
- The laptop layout (1280×800) was checked to be the same as before.
- Unit tests in `packages/editor/tests/palmRejection.test.tsx`: pen mode turns on at the first pen input; one finger doesn't draw in pen mode; a palm landing mid-stroke doesn't cut, erase or steer the stroke or zoom. (The last test fails without the fix.)
- All existing tests still pass, including the mobile menu snapshot; no snapshots had to change.

## Limits

- Not tried on a real phone or tablet yet, only in emulation. Real pen input should be checked on an iPad and an Android tablet.
- Phones narrower than about 370 px move the text tool into "more tools" to keep 44 px buttons.
- The library (sidebar) and pen-mode buttons stay in the top-right; they're used less often.
