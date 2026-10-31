# Accessibility: the board outline

A whiteboard is a picture, and a screen reader can't read a picture. The **board outline** gives the same board as a structured list of text, so blind and keyboard-only users can find out what's on the board, follow live changes, and edit it.

## Opening it

- **Alt+Shift+O** (Option+Shift+O on a Mac) opens and closes it from anywhere. Focus lands on the first item, or where you were last time.
- **Skip to board outline** is the first thing on the page, so screen readers reach it first. It's hidden until it gets keyboard focus.
- **Main menu → Board outline**, the **Board outline** button in the Help dialog (`?`), or the outline tab in the right sidebar.

## What each item says

Items are listed in reading order: top to bottom, then left to right. Things side by side count as one row. Frames and groups are folders with their items inside; text inside a shape belongs to that shape.

Each item says what it is, what it says, where it is, how big it is, its colours (only when changed from the default) and what it's connected to. Examples:

- _Rectangle with text 'Login', left of frame 'Week 1', 160 by 80, blue outline, light blue fill, arrow to 'Dashboard'_
- _Arrow from 'Login' to 'Dashboard'_
- _Sticky note 'Exam on Friday', top right of the board, 200 by 200, yellow_
- _Freehand drawing_, _Image_, _Text 'Revision plan'_, _Group of 3 items_

Position is in thirds ("top left", "centre", "bottom right") of the whole board, or of the frame the item is in. Connections come from arrows that are attached to shapes.

## Keys

| Key | What it does |
| --- | --- |
| Up / Down, Home / End, Page Up / Page Down | Move through items |
| Right / Left | Open or close a frame or group, or jump into it / back to it |
| Enter | Show the item on the board: zoom to it and select it |
| Space | Select it on the board |
| F2 | Edit its text (shapes, sticky notes, text, arrow labels). This opens the board's own text editor; press Escape when done and you're back on the same item |
| Delete | Delete it. Ctrl+Z (Cmd+Z) undoes it |
| Tab | Go to the buttons above the list: Select, Zoom to, Edit text, Delete |
| Escape | Close the outline (unless the sidebar is pinned open; Alt+Shift+O always closes it) |

Letters typed in the outline never switch drawing tools. Locked items can't be edited or deleted from the outline. Clicking or tapping works too: tap an item, then a button.

In **view-only** boards (viewers), Edit text and Delete are hidden and the keys for them do nothing.

## Working on a live board

When other people change the board, a hidden status message (`aria-live="polite"`) tells you in plain words, for example "Ada added 2 rectangles.", "Someone removed a sticky note 'Exam on Friday'." or "Ben joined the board.". To keep it calm:

- your own changes are never announced, not even while you type or drag;
- messages come at most once every 4 seconds, with bursts merged;
- nothing is announced while you are in the middle of drawing or typing; it waits until you finish.

The last 8 messages are kept under **Recent changes by others** at the bottom of the outline, in case you missed one.

Who made a change is a best guess: the person who has that item selected, or the only other person on the board. Otherwise it says "Someone".

## Other fixes

- Tab no longer gets stuck on the canvas. It used to be swallowed there (the editor uses Tab to switch shape types); now it only does that when a shape that can be switched is selected.
- The main menu button now has a name ("Menu") for screen readers.

## How it was tested

- Unit tests for reading order, descriptions, colours, frames and groups, deleting, change summaries and join/leave messages: `app/tests/boardOutlineModel.test.ts`, `app/tests/boardActivity.test.ts`.
- Headless Chromium (Playwright), keyboard only, on a 1280×800 laptop size and a 375×812 touch phone, light and dark theme: open with Alt+Shift+O, move, Enter, F2 edit and back, Delete and undo, collapse a frame, skip link, Help dialog buttons, letters not switching tools.
- Live updates with simulated collaborators: remote adds, removes, joins and leaves were announced; drawing, undoing and typing locally were not.
- 10,000 shapes: the outline lists all 10,000 but only draws the ~20 rows on screen. Thirty Page Downs plus End took about 0.35 s, and building the outline for 10,000 items takes well under a second in the unit test.

## Limits

- Not yet tried with a real screen reader (NVDA, VoiceOver, TalkBack). It uses standard tree, status and dialog roles, but a manual check is still needed.
- Descriptions are worked out from the shapes, so they can be rough: freehand drawings and images aren't described beyond their type, and positions are in thirds only.
- Colours are the stored colours, so in dark mode a "black" outline is shown light on screen.
- Text editing uses the board's text editor rather than a field inside the outline.
- Lines and frame names can't be edited from the outline.
