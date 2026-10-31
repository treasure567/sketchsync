import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  MainMenu,
  useSketchSyncAPI,
  useSketchSyncStateValue,
} from "@sketchsync/editor";

import type {
  AppState,
  SketchSyncImperativeAPI,
} from "@sketchsync/editor/types";
import type { SketchSyncElement } from "@sketchsync/element/types";

import { useSetAtom } from "../app-jotai";

import {
  collectLabels,
  diffBoard,
  guessActor,
  hasChanges,
  presenceSnapshot,
  summarizeBoardChanges,
  summarizePresence,
  takeVersionSnapshot,
} from "./boardActivity";
import { outlineIcon } from "./BoardOutline";
import {
  BOARD_OUTLINE_REGION_ID,
  BOARD_OUTLINE_SHORTCUT,
  MAX_ACTIVITY_ENTRIES,
  boardActivityLogAtom,
  closeBoardOutline,
  consumeTextEditFromOutline,
  focusCanvas,
  isBoardOutlineOpen,
  openBoardOutline,
} from "./boardOutlineState";
import { startQuickTour } from "./OnboardingTour";

const DIFF_DELAY_MS = 800;
const ANNOUNCE_GAP_MS = 4000;
const BURST_MERGE_MS = 400;
const SETTLE_AFTER_JOIN_MS = 2500;
const MAX_MESSAGES_PER_ANNOUNCEMENT = 3;

const isLocalInteractionInProgress = (appState: AppState) =>
  appState.cursorButton === "down" ||
  !!appState.newElement ||
  !!appState.multiElement ||
  !!appState.editingTextElement ||
  appState.selectedElementsAreBeingDragged ||
  appState.isResizing ||
  appState.isRotating;

const toggleBoardOutline = (api: SketchSyncImperativeAPI) => {
  if (isBoardOutlineOpen(api)) {
    closeBoardOutline(api);
    focusCanvas();
  } else {
    openBoardOutline(api);
  }
};

const isOutlineShortcut = (event: KeyboardEvent) =>
  event.altKey &&
  event.shiftKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  event.code === "KeyO";

const SkipToOutlineLink = ({ api }: { api: SketchSyncImperativeAPI }) => {
  const [host] = useState(() => {
    const element = document.createElement("div");
    element.className = "sketchsync-skip-links";
    return element;
  });

  useLayoutEffect(() => {
    document.body.prepend(host);
    return () => host.remove();
  }, [host]);

  return createPortal(
    <a
      className="sketchsync-skip-link"
      href={`#${BOARD_OUTLINE_REGION_ID}`}
      onClick={(event) => {
        event.preventDefault();
        openBoardOutline(api);
      }}
    >
      Skip to board outline ({BOARD_OUTLINE_SHORTCUT})
    </a>,
    host,
  );
};

const useBoardAnnouncements = (api: SketchSyncImperativeAPI) => {
  const [announcement, setAnnouncement] = useState("");
  const setActivityLog = useSetAtom(boardActivityLogAtom);

  useEffect(() => {
    const ownVersions = new Map<string, number>();
    let snapshot: Map<string, number> | null = null;
    let presence = new Map<string, string>();
    let lastCollaborators: AppState["collaborators"] | null = null;
    let settleUntil = 0;
    let pendingMessages: string[] = [];
    let lastAnnouncedAt = 0;
    let entryId = 0;
    let diffTimer: number | null = null;
    let flushTimer: number | null = null;
    let revealTimer: number | null = null;

    const isOwnChange = (element: SketchSyncElement) =>
      (ownVersions.get(element.id) ?? -1) >= element.version;

    const flush = () => {
      flushTimer = null;
      if (!pendingMessages.length) {
        return;
      }
      const shown = pendingMessages.slice(-MAX_MESSAGES_PER_ANNOUNCEMENT);
      const skipped = pendingMessages.length - shown.length;
      const message = [
        ...(skipped > 0 ? [`${skipped} earlier updates.`] : []),
        ...shown,
      ].join(" ");
      pendingMessages = [];
      lastAnnouncedAt = Date.now();
      setActivityLog((log) =>
        [{ id: ++entryId, message, at: lastAnnouncedAt }, ...log].slice(
          0,
          MAX_ACTIVITY_ENTRIES,
        ),
      );
      // clearing first makes screen readers repeat a message identical to the
      // previous one
      setAnnouncement("");
      revealTimer = window.setTimeout(() => setAnnouncement(message), 100);
    };

    const queue = (message: string) => {
      pendingMessages.push(message);
      if (flushTimer !== null) {
        return;
      }
      const wait = Math.max(
        BURST_MERGE_MS,
        lastAnnouncedAt + ANNOUNCE_GAP_MS - Date.now(),
      );
      flushTimer = window.setTimeout(flush, wait);
    };

    const runDiff = () => {
      diffTimer = null;
      if (api.isDestroyed) {
        return;
      }
      const appState = api.getAppState();
      if (isLocalInteractionInProgress(appState)) {
        diffTimer = window.setTimeout(runDiff, DIFF_DELAY_MS);
        return;
      }
      const elements = api.getSceneElementsIncludingDeleted();
      if (!snapshot || !presence.size || Date.now() < settleUntil) {
        snapshot = takeVersionSnapshot(elements);
        return;
      }
      const result = diffBoard(snapshot, elements, isOwnChange);
      snapshot = result.snapshot;
      if (!hasChanges(result.changes)) {
        return;
      }
      const message = summarizeBoardChanges(
        result.changes,
        guessActor(result.changes, appState.collaborators),
        collectLabels(elements),
      );
      if (message) {
        queue(message);
      }
    };

    const trackPresence = (collaborators: AppState["collaborators"]) => {
      if (collaborators === lastCollaborators) {
        return;
      }
      lastCollaborators = collaborators;
      const next = presenceSnapshot(collaborators);
      if (!presence.size && next.size) {
        settleUntil = Date.now() + SETTLE_AFTER_JOIN_MS;
      }
      const message = summarizePresence(presence, next);
      presence = next;
      if (message) {
        queue(message);
      }
    };

    const unsubscribeIncrement = api.onIncrement((increment) => {
      if (increment.type !== "durable") {
        return;
      }
      for (const element of Object.values(increment.change.elements)) {
        ownVersions.set(element.id, element.version);
      }
    });

    const unsubscribeChange = api.onChange((_elements, appState) => {
      trackPresence(appState.collaborators);
      if (diffTimer === null) {
        diffTimer = window.setTimeout(runDiff, DIFF_DELAY_MS);
      }
    });

    return () => {
      unsubscribeIncrement();
      unsubscribeChange();
      for (const timer of [diffTimer, flushTimer, revealTimer]) {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
      }
    };
  }, [api, setActivityLog]);

  return announcement;
};

const BoardAnnouncer = ({ api }: { api: SketchSyncImperativeAPI }) => {
  const announcement = useBoardAnnouncements(api);
  return (
    <div
      className="visually-hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="board-announcer"
    >
      {announcement}
    </div>
  );
};

const HELP_HEADER_LOOKUP_FRAMES = 30;

const HelpDialogShortcuts = ({ api }: { api: SketchSyncImperativeAPI }) => {
  const isHelpOpen = useSketchSyncStateValue(
    (appState) => appState.openDialog?.name === "help",
  );
  const [header, setHeader] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isHelpOpen) {
      setHeader(null);
      return;
    }
    let framesLeft = HELP_HEADER_LOOKUP_FRAMES;
    let frame = 0;
    // the dialog renders through its own portal after this state change, so
    // its header only exists a frame or two later
    const findHeader = () => {
      const element = document.querySelector<HTMLElement>(
        ".HelpDialog__header",
      );
      if (element) {
        setHeader(element);
      } else if (framesLeft-- > 0) {
        frame = window.requestAnimationFrame(findHeader);
      }
    };
    findHeader();
    return () => window.cancelAnimationFrame(frame);
  }, [isHelpOpen]);

  if (!header) {
    return null;
  }

  const closeHelpThen = (next: () => void) => {
    api.updateScene({ appState: { openDialog: null } });
    next();
  };

  return createPortal(
    <>
      <button
        type="button"
        className="HelpDialog__btn sketchsync-help-button"
        onClick={() => closeHelpThen(startQuickTour)}
      >
        Quick tour
      </button>
      <button
        type="button"
        className="HelpDialog__btn sketchsync-help-button"
        onClick={() => closeHelpThen(() => openBoardOutline(api))}
      >
        Board outline ({BOARD_OUTLINE_SHORTCUT})
      </button>
    </>,
    header,
  );
};

export const BoardAccessibility = () => {
  const api = useSketchSyncAPI();
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const currentApi = apiRef.current;
      if (!currentApi || !isOutlineShortcut(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      toggleBoardOutline(currentApi);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }
    // the sidebar's own Escape listener closes it after the Escape that ends
    // text editing, so the outline reopens once that key event is done
    return api.onStateChange("editingTextElement", (editingTextElement) => {
      if (!editingTextElement && consumeTextEditFromOutline()) {
        window.setTimeout(() => openBoardOutline(api));
      }
    });
  }, [api]);

  if (!api) {
    return null;
  }

  return (
    <>
      <SkipToOutlineLink api={api} />
      <BoardAnnouncer api={api} />
      <HelpDialogShortcuts api={api} />
    </>
  );
};

export const BoardOutlineMenuItem = () => {
  const api = useSketchSyncAPI();
  return (
    <MainMenu.Item
      icon={outlineIcon}
      shortcut={BOARD_OUTLINE_SHORTCUT}
      onSelect={() => api && openBoardOutline(api)}
      data-testid="board-outline-menu-item"
    >
      Board outline
    </MainMenu.Item>
  );
};
