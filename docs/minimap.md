# Minimap

The minimap is a small overview of the whole board in the bottom-right corner, just above the help (`?`) button. It shows where everything is and which part you're looking at, and lets you jump around big boards.

## What it shows

- Every object on the board as a simple shape in its own colours:
  - rectangles, diamonds, ellipses and sticky notes as boxes in their fill colour, with an outline in the stroke colour when they're big enough to see one (rotated shapes use the box around the rotated shape),
  - lines, arrows and freehand drawings as thin lines,
  - text as a faint bar in the text colour,
  - images and embedded websites as grey blocks, frames as outlines.
- The board's background colour.
- **Your view**: the tinted rectangle with a purple border.

The map always fits both the drawing and your view, so you can't get lost: if you scroll far away, the drawing shrinks into a corner of the map and the rectangle shows where you are.

## Using it

| Action | Result |
| --- | --- |
| Click on the map | The view jumps there (centred on the click). |
| Drag the rectangle (or drag anywhere) | The view follows the pointer. |
| Tab to the map, then arrow keys | Moves the view a quarter of the screen. **Shift + arrow** moves a whole screen. |
| Button under the map, or **Alt+M** (Option+M on a Mac) | Hides or shows the map. |

- The show/hide choice is remembered in this browser.
- The map isn't shown on phones (there's no room), in zen mode, or on an empty board (the welcome screen uses that corner).
- When a sidebar is open, the map moves left of it.
- It follows light and dark theme: the panel uses the editor's theme colours, and object colours go through the same dark-mode conversion as the board.

**Alt+M** isn't used by the editor or the board outline (Alt+Shift+O), and it's ignored while you're typing in a text box.

## Accessibility

- The toggle is a real button with a label ("Show minimap" / "Hide minimap") and an on/off state for screen readers. Its tooltip shows the shortcut.
- The map is labelled as an image that describes what it is and how to use it, it can be focused with Tab, and it shows a focus ring.
- While the map has focus, the arrow keys move the view instead of nudging the selected objects, and Enter, Space, Delete, Backspace, Home, End, Page Up and Page Down do nothing. Without this, the editor (which listens for keys on the whole page) would start editing or delete the selected objects. Shortcuts with Ctrl or Cmd (undo, copy and so on) still work.

## How it stays fast with 10,000 objects

- **No React for drawing.** It listens to `sketchsyncAPI.onChange`, stores the latest state, and draws at most once per animation frame on a small 200 × 140 canvas.
- **Skips frames when nothing changed.** It compares a quick hash of the objects' versions, the view (scroll, zoom, window size) and the theme. Selecting, hovering and other changes don't redraw anything.
- **Two layers.** The objects are drawn once into an off-screen canvas. When you only pan or zoom, it copies that picture and draws the view rectangle on top.
- **Rebuilding is throttled.** When objects change, the list of shapes is rebuilt at most every 120 ms. Shapes are grouped by colour so each colour is one canvas path, long lines are cut down to 24 points, colour parsing is cached, and the boxes come from the editor's cached element bounds.
- **Hidden means off.** When it's hidden it doesn't draw at all; it only keeps an eye on a few settings (phone, zen mode, sidebar, empty board).

Measured in headless Chromium with 10,000 objects: a minimap frame while panning takes about 0.7 ms (worst 1.3 ms); a rebuild after an edit takes about 4 ms and happens at most 8 times a second. Panning ran at 60 fps (16.7 ms per frame) both with the map shown and hidden.

## Where the code is

| File | What |
| --- | --- |
| `app/components/Minimap.tsx` | The component, the drawing code and the click/drag/keyboard maths |
| `app/components/Minimap.scss` | Position, panel and button styles |
| `app/App.tsx` | Mounts `<Minimap>` inside `<SketchSync>` |
| `app/tests/Minimap.test.tsx` | Tests for the map maths (fit, click to jump, drag, arrow keys) and for keys staying away from the selection while the map has focus |
