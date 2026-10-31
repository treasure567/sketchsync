export type TourContext = {
  isPhone: boolean;
  isMac: boolean;
};

export type TourStep = {
  id: string;
  title: string;
  body: (context: TourContext) => string;
  targets: readonly string[];
};

export const TOUR_STORAGE_KEY = "sketchsync-quick-tour-done";

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "draw",
    title: "Welcome to SketchSync",
    body: ({ isPhone }) =>
      isPhone
        ? "Pick a tool in the bar at the bottom, then drag on the board with one finger to draw. More tools, like sticky notes and frames, sit behind the ⋮ button."
        : "Pick a tool in the toolbar, then drag on the board to draw. Keys switch tools quickly: R for rectangle, A for arrow, P for pen, T for text.",
    targets: [".App-toolbar", ".App-toolbar-container"],
  },
  {
    id: "move",
    title: "Move around the board",
    body: ({ isPhone, isMac }) =>
      isPhone
        ? "Drag with two fingers to move around and pinch to zoom. With a stylus, one finger never draws, so your palm can rest on the screen."
        : `Scroll to move around and hold ${
            isMac ? "Cmd" : "Ctrl"
          } while scrolling to zoom. You can also pick the hand tool (H) and drag.`,
    targets: ['[data-testid="toolbar-hand"]'],
  },
  {
    id: "share",
    title: "Work together",
    body: ({ isPhone }) =>
      isPhone
        ? "Share opens sharing: it's in the top-right on a laptop and in the ☰ menu by your thumb on a phone. Everyone you invite sees changes live."
        : "Share in the top-right opens sharing. Send the link to your study group and everyone sees changes live.",
    targets: [".sketchsync-ui-top-right .collab-button", ".collab-button"],
  },
  {
    id: "undo",
    title: "Undo anything",
    body: ({ isPhone, isMac }) =>
      isPhone
        ? "Tap undo or redo just above the tools. The ☰ menu next to them holds export, help, the board outline and this tour if you want it again."
        : `Press ${
            isMac ? "Cmd+Z" : "Ctrl+Z"
          } or use the undo button. The ☰ menu holds export, help, the board outline and this tour if you want it again.`,
    targets: ['[data-testid="button-undo"]'],
  },
];

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CardPlacement = {
  left: number;
  top: number;
  side: "above" | "below" | "centre";
};

const VIEWPORT_MARGIN = 12;
const TARGET_GAP = 12;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const placeTourCard = (
  target: Rect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): CardPlacement => {
  const centred: CardPlacement = {
    left: clamp(
      (viewport.width - card.width) / 2,
      VIEWPORT_MARGIN,
      viewport.width - card.width - VIEWPORT_MARGIN,
    ),
    top: clamp(
      (viewport.height - card.height) / 2,
      VIEWPORT_MARGIN,
      viewport.height - card.height - VIEWPORT_MARGIN,
    ),
    side: "centre",
  };
  if (!target) {
    return centred;
  }

  const left = clamp(
    target.left + target.width / 2 - card.width / 2,
    VIEWPORT_MARGIN,
    viewport.width - card.width - VIEWPORT_MARGIN,
  );
  const below = target.top + target.height + TARGET_GAP;
  if (below + card.height <= viewport.height - VIEWPORT_MARGIN) {
    return { left, top: below, side: "below" };
  }
  const above = target.top - TARGET_GAP - card.height;
  if (above >= VIEWPORT_MARGIN) {
    return { left, top: above, side: "above" };
  }
  return centred;
};

export const readTourDone = (storage: Pick<Storage, "getItem"> | null) => {
  try {
    return storage ? storage.getItem(TOUR_STORAGE_KEY) === "1" : null;
  } catch {
    return null;
  }
};

export const writeTourDone = (storage: Pick<Storage, "setItem"> | null) => {
  try {
    storage?.setItem(TOUR_STORAGE_KEY, "1");
    return !!storage;
  } catch {
    return false;
  }
};
