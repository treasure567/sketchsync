import { DEFAULT_SIDEBAR } from "@sketchsync/common";

import type { SketchSyncImperativeAPI } from "@sketchsync/editor/types";

import { appJotaiStore, atom } from "../app-jotai";

export const BOARD_OUTLINE_TAB = "outline";
export const BOARD_OUTLINE_SHORTCUT = "Alt+Shift+O";
export const BOARD_OUTLINE_REGION_ID = "sketchsync-board-outline";

export type BoardActivityEntry = {
  id: number;
  message: string;
  at: number;
};

export const MAX_ACTIVITY_ENTRIES = 8;

export const boardActivityLogAtom = atom<readonly BoardActivityEntry[]>([]);

export const boardOutlineFocusRequestAtom = atom(0);

export const isBoardOutlineOpen = (api: SketchSyncImperativeAPI) => {
  const { openSidebar } = api.getAppState();
  return (
    openSidebar?.name === DEFAULT_SIDEBAR.name &&
    openSidebar.tab === BOARD_OUTLINE_TAB
  );
};

export const openBoardOutline = (api: SketchSyncImperativeAPI) => {
  api.toggleSidebar({
    name: DEFAULT_SIDEBAR.name,
    tab: BOARD_OUTLINE_TAB,
    force: true,
  });
  appJotaiStore.set(boardOutlineFocusRequestAtom, (request) => request + 1);
};

export const closeBoardOutline = (api: SketchSyncImperativeAPI) => {
  api.toggleSidebar({ name: DEFAULT_SIDEBAR.name, force: false });
};

let isTextEditFromOutline = false;

export const markTextEditFromOutline = () => {
  isTextEditFromOutline = true;
};

export const consumeTextEditFromOutline = () => {
  const wasFromOutline = isTextEditFromOutline;
  isTextEditFromOutline = false;
  return wasFromOutline;
};

export const focusCanvas = () => {
  document.querySelector<HTMLElement>(".sketchsync")?.focus();
};
