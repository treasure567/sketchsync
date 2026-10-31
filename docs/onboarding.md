# Onboarding: the quick tour

New users get a short tour the first time they open SketchSync. It has four small cards, each pointing at the real button it talks about:

1. **Welcome to SketchSync**: pick a tool in the toolbar and drag to draw (keys R, A, P, T on a laptop; the ⋮ button for more tools on a phone).
2. **Move around the board**: scroll and Ctrl/Cmd+scroll on a laptop; two-finger drag and pinch on a phone, plus the hand tool. Points at the hand tool.
3. **Work together**: Share in the top-right opens sharing (on a phone it's in the ☰ menu).
4. **Undo anything**: Ctrl/Cmd+Z or the undo button, and where to find this tour again. Points at the undo button.

## Why it takes under a minute

Four cards and about 100 words on a laptop (about 120 on a phone). At a relaxed reading pace that's 30 to 40 seconds. A unit test fails if the text grows past 200 words or 5 steps.

## Staying out of the way

- It's a small card with a ring around the button it means. There's no dark overlay, so the board still works while the card is open.
- **Skip tour** is on every card. Escape also closes it.
- It's keyboard friendly: focus moves to the card, so screen readers read the title and text; Tab reaches Skip, Back and Next. Letters typed on the card don't switch tools.
- On a phone the card sits above the bottom toolbar, full width.
- It doesn't start for view-only users, who can't draw.

## Remembering and reopening

Finishing or skipping saves `sketchsync-quick-tour-done` in the browser's local storage, so the tour doesn't come back. If local storage is blocked, the tour doesn't start by itself (it couldn't remember being closed).

Reopen it from **Main menu → Quick tour** or the **Quick tour** button in the Help dialog (`?`). To see the first-run version again, delete that key in the browser's dev tools.

## Where the code is

- `app/components/OnboardingTour.tsx` and `.scss`: the card, highlight and menu item.
- `app/components/onboardingTourSteps.ts`: the step text, card placement and storage helpers.
- `app/tests/onboardingTour.test.ts`: tests for length, wording, placement and storage.
