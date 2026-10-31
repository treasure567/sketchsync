import clsx from "clsx";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CaptureUpdateAction,
  Sidebar,
  useSketchSyncAPI,
  useSketchSyncStateValue,
} from "@sketchsync/editor";
import { isDarwin } from "@sketchsync/common";
import { hashElementsVersion } from "@sketchsync/element";

import type { SketchSyncImperativeAPI } from "@sketchsync/editor/types";

import { atom, useAtom, useAtomValue } from "../app-jotai";

import {
  buildOutline,
  deleteFromBoard,
  describeNode,
  flattenOutline,
  getDeletableIds,
  hasEditableText,
} from "./boardOutlineModel";
import {
  BOARD_OUTLINE_REGION_ID,
  BOARD_OUTLINE_SHORTCUT,
  BOARD_OUTLINE_TAB,
  boardActivityLogAtom,
  boardOutlineFocusRequestAtom,
  closeBoardOutline,
  markTextEditFromOutline,
} from "./boardOutlineState";

import "./BoardOutline.scss";

import type {
  OutlineDescription,
  OutlineNode,
  OutlineRow,
  OutlineTree,
} from "./boardOutlineModel";

const ROW_HEIGHT = 56;
const OVERSCAN_ROWS = 6;
const REBUILD_DELAY_MS = 250;
const UNDO_HINT = isDarwin ? "Cmd+Z" : "Ctrl+Z";

export const outlineIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 6h11M12 12h8M12 18h8M4 6h1M7 12h1M7 18h1M5 6v12" />
  </svg>
);

const activeKeyAtom = atom<string | null>(null);
const collapsedKeysAtom = atom<ReadonlySet<string>>(new Set<string>());

let lastHandledFocusRequest = 0;

const descriptionsByTree = new WeakMap<
  OutlineTree,
  Map<string, OutlineDescription>
>();

const describeLazily = (node: OutlineNode, tree: OutlineTree) => {
  let descriptions = descriptionsByTree.get(tree);
  if (!descriptions) {
    descriptions = new Map();
    descriptionsByTree.set(tree, descriptions);
  }
  let description = descriptions.get(node.key);
  if (!description) {
    description = describeNode(node, tree);
    descriptions.set(node.key, description);
  }
  return description;
};

const isPhone = (api: SketchSyncImperativeAPI) =>
  api.getEditorInterface().formFactor === "phone";

const useOutlineTree = (api: SketchSyncImperativeAPI | null) => {
  const [tree, setTree] = useState<OutlineTree>(() =>
    buildOutline(api?.getSceneElements() ?? []),
  );
  const lastHashRef = useRef<number | null>(null);

  const rebuild = useCallback(() => {
    if (!api || api.isDestroyed) {
      return;
    }
    const elements = api.getSceneElements();
    const hash = hashElementsVersion(elements);
    if (hash !== lastHashRef.current) {
      lastHashRef.current = hash;
      setTree(buildOutline(elements));
    }
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }
    rebuild();
    let timer: number | null = null;
    const unsubscribe = api.onChange(() => {
      if (timer === null) {
        timer = window.setTimeout(() => {
          timer = null;
          rebuild();
        }, REBUILD_DELAY_MS);
      }
    });
    return () => {
      unsubscribe();
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [api, rebuild]);

  return [tree, rebuild] as const;
};

const isNodeSelected = (
  node: OutlineNode,
  selectedElementIds: Readonly<Record<string, true>>,
) =>
  node.memberIds.length > 0 &&
  node.memberIds.every((id) => selectedElementIds[id]);

const OutlineTreeRow = React.memo(
  ({
    row,
    index,
    description,
    isActive,
    isSelected,
    isExpanded,
    onActivate,
    onZoom,
    onToggle,
  }: {
    row: OutlineRow;
    index: number;
    description: OutlineDescription;
    isActive: boolean;
    isSelected: boolean;
    isExpanded: boolean;
    onActivate: (index: number) => void;
    onZoom: (index: number) => void;
    onToggle: (index: number) => void;
  }) => {
    const hasChildren = row.node.children.length > 0;
    return (
      <div
        role="treeitem"
        aria-level={row.level}
        aria-setsize={row.setSize}
        aria-posinset={row.posInSet}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={description.spoken}
        tabIndex={isActive ? 0 : -1}
        data-outline-index={index}
        className={clsx("board-outline__row", {
          "board-outline__row--active": isActive,
          "board-outline__row--selected": isSelected,
        })}
        style={{
          top: index * ROW_HEIGHT,
          height: ROW_HEIGHT,
          paddingInlineStart: `${0.5 + (row.level - 1) * 1.25}rem`,
        }}
        onClick={() => onActivate(index)}
        onDoubleClick={() => onZoom(index)}
      >
        <span
          className="board-outline__row-toggle"
          aria-hidden="true"
          onClick={(event) => {
            if (hasChildren) {
              event.stopPropagation();
              onToggle(index);
            }
          }}
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        <span className="board-outline__row-text">
          <span className="board-outline__row-title">{description.title}</span>
          <span className="board-outline__row-details">
            {description.details}
          </span>
        </span>
      </div>
    );
  },
);
OutlineTreeRow.displayName = "OutlineTreeRow";

const RecentActivity = () => {
  const log = useAtomValue(boardActivityLogAtom);
  if (!log.length) {
    return null;
  }
  return (
    <details className="board-outline__activity">
      <summary>Recent changes by others ({log.length})</summary>
      <ul>
        {log.map((entry) => (
          <li key={entry.id}>
            <time dateTime={new Date(entry.at).toISOString()}>
              {new Date(entry.at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>{" "}
            {entry.message}
          </li>
        ))}
      </ul>
    </details>
  );
};

export const BoardOutline = () => {
  const api = useSketchSyncAPI();
  const viewModeEnabled = !!useSketchSyncStateValue("viewModeEnabled");
  const selectedElementIds =
    useSketchSyncStateValue("selectedElementIds") ?? {};
  const focusRequest = useAtomValue(boardOutlineFocusRequestAtom);

  const [tree, rebuildTree] = useOutlineTree(api);
  const [collapsedKeys, setCollapsedKeys] = useAtom(collapsedKeysAtom);
  const [activeKey, setActiveKey] = useAtom(activeKeyAtom);
  const [status, setStatus] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(400);

  const treeRef = useRef<HTMLDivElement>(null);
  const shouldFocusActiveRowRef = useRef(false);
  const lastActiveIndexRef = useRef(0);

  const rows = useMemo(
    () => flattenOutline(tree.roots, collapsedKeys),
    [tree, collapsedKeys],
  );
  const indexByKey = useMemo(
    () => new Map(rows.map((row, index) => [row.node.key, index])),
    [rows],
  );
  const describe = useCallback(
    (node: OutlineNode) => describeLazily(node, tree),
    [tree],
  );

  const activeIndex = rows.length
    ? indexByKey.get(activeKey ?? "") ??
      Math.min(lastActiveIndexRef.current, rows.length - 1)
    : -1;
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : null;
  const activeNode = activeRow?.node ?? null;
  const activeDescription = activeNode ? describe(activeNode) : null;

  useEffect(() => {
    if (activeIndex >= 0) {
      lastActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  useLayoutEffect(() => {
    const container = treeRef.current;
    if (!container) {
      return;
    }
    setViewportHeight(container.clientHeight);
    const observer = new ResizeObserver(() =>
      setViewportHeight(container.clientHeight),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scrollRowIntoView = useCallback((index: number) => {
    const container = treeRef.current;
    if (!container) {
      return;
    }
    const top = index * ROW_HEIGHT;
    if (top < container.scrollTop) {
      container.scrollTop = top;
    } else if (
      top + ROW_HEIGHT >
      container.scrollTop + container.clientHeight
    ) {
      container.scrollTop = top + ROW_HEIGHT - container.clientHeight;
    }
    setScrollTop(container.scrollTop);
  }, []);

  const moveTo = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) {
        return;
      }
      shouldFocusActiveRowRef.current = true;
      setActiveKey(row.node.key);
      scrollRowIntoView(index);
    },
    [rows, scrollRowIntoView, setActiveKey],
  );

  useLayoutEffect(() => {
    if (!shouldFocusActiveRowRef.current) {
      return;
    }
    shouldFocusActiveRowRef.current = false;
    const target =
      treeRef.current?.querySelector<HTMLElement>(
        `[data-outline-index="${activeIndex}"]`,
      ) ?? treeRef.current;
    target?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (focusRequest > lastHandledFocusRequest) {
      lastHandledFocusRequest = focusRequest;
      if (activeIndex >= 0) {
        moveTo(activeIndex);
      } else {
        treeRef.current?.focus();
      }
    }
  }, [focusRequest, activeIndex, moveTo]);

  const elementsOf = useCallback(
    (node: OutlineNode) =>
      node.memberIds
        .map((id) => tree.elementsById.get(id))
        .filter((element): element is NonNullable<typeof element> =>
          Boolean(element),
        ),
    [tree],
  );

  const selectNode = useCallback(
    (node: OutlineNode) => {
      api?.selection.select(node.memberIds);
    },
    [api],
  );

  const zoomToNode = useCallback(
    (node: OutlineNode) => {
      if (!api) {
        return;
      }
      const elements = elementsOf(node);
      if (!elements.length) {
        return;
      }
      selectNode(node);
      if (isPhone(api)) {
        closeBoardOutline(api);
      }
      api.setViewport({
        target: elements,
        fit: "scale-down",
        animation: true,
        offsets: { ui: true },
      });
      setStatus(`Showing ${describe(node).title} on the board.`);
    },
    [api, describe, elementsOf, selectNode],
  );

  const editNodeText = useCallback(
    (node: OutlineNode) => {
      const element = node.element;
      if (!api || viewModeEnabled || !element || !hasEditableText(element)) {
        return;
      }
      if (element.locked) {
        setStatus("This item is locked, so its text can't be edited.");
        return;
      }
      markTextEditFromOutline();
      api.selection.select(element);
      if (isPhone(api)) {
        closeBoardOutline(api);
      }
      api.setViewport({
        target: element,
        fit: "scale-down",
        offsets: { ui: true },
      });
      // the editor's own Enter shortcut starts text editing on the selection,
      // which only exists once the selection change has rendered
      window.requestAnimationFrame(() => {
        const container = document.querySelector(".sketchsync");
        container?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
      });
    },
    [api, viewModeEnabled],
  );

  const deleteNode = useCallback(
    (node: OutlineNode) => {
      if (!api || viewModeEnabled) {
        return;
      }
      const ids = getDeletableIds(node, tree.elementsById);
      const { title } = describe(node);
      if (!ids.length) {
        setStatus(`${title} is locked, so it can't be deleted.`);
        return;
      }
      api.updateScene({
        elements: deleteFromBoard(api.getSceneElementsIncludingDeleted(), ids),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      shouldFocusActiveRowRef.current = true;
      rebuildTree();
      setStatus(`Deleted ${title}. Press ${UNDO_HINT} to undo.`);
    },
    [api, describe, rebuildTree, tree, viewModeEnabled],
  );

  const toggleExpanded = useCallback(
    (node: OutlineNode, expanded: boolean) => {
      setCollapsedKeys((keys) => {
        const next = new Set(keys);
        if (expanded) {
          next.delete(node.key);
        } else {
          next.add(node.key);
        }
        return next;
      });
    },
    [setCollapsedKeys],
  );

  const activateRow = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) {
        return;
      }
      moveTo(index);
      selectNode(row.node);
    },
    [moveTo, rows, selectNode],
  );

  const toggleRow = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) {
        moveTo(index);
        toggleExpanded(row.node, collapsedKeys.has(row.node.key));
      }
    },
    [collapsedKeys, moveTo, rows, toggleExpanded],
  );

  const zoomToRow = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) {
        zoomToNode(row.node);
      }
    },
    [rows, zoomToNode],
  );

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!activeRow || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const { node } = activeRow;
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && !collapsedKeys.has(node.key);
    const pageSize = Math.max(1, Math.floor(viewportHeight / ROW_HEIGHT) - 1);

    switch (event.key) {
      case "ArrowDown":
        moveTo(Math.min(activeIndex + 1, rows.length - 1));
        break;
      case "ArrowUp":
        moveTo(Math.max(activeIndex - 1, 0));
        break;
      case "Home":
        moveTo(0);
        break;
      case "End":
        moveTo(rows.length - 1);
        break;
      case "PageDown":
        moveTo(Math.min(activeIndex + pageSize, rows.length - 1));
        break;
      case "PageUp":
        moveTo(Math.max(activeIndex - pageSize, 0));
        break;
      case "ArrowRight":
        if (hasChildren && !isExpanded) {
          toggleExpanded(node, true);
        } else if (hasChildren) {
          moveTo(activeIndex + 1);
        }
        break;
      case "ArrowLeft":
        if (isExpanded) {
          toggleExpanded(node, false);
        } else if (activeRow.parentKey) {
          moveTo(indexByKey.get(activeRow.parentKey) ?? activeIndex);
        }
        break;
      case "Enter":
        zoomToNode(node);
        break;
      case " ":
        selectNode(node);
        setStatus(`Selected ${describe(node).title}.`);
        break;
      case "Delete":
      case "Backspace":
        deleteNode(node);
        break;
      case "F2":
        editNodeText(node);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    // the editor listens for single-key tool shortcuts on the document, which
    // must not fire while someone is typing their way through the outline
    if (
      event.key !== "Escape" &&
      event.key !== "Tab" &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.stopPropagation();
    }
  };

  const firstVisibleIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  );
  const lastVisibleIndex = Math.min(
    rows.length - 1,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN_ROWS,
  );
  const renderedIndices: number[] = [];
  for (let index = firstVisibleIndex; index <= lastVisibleIndex; index++) {
    renderedIndices.push(index);
  }
  if (
    activeIndex >= 0 &&
    (activeIndex < firstVisibleIndex || activeIndex > lastVisibleIndex)
  ) {
    renderedIndices.push(activeIndex);
  }

  const canEditText =
    !viewModeEnabled &&
    !!activeNode?.element &&
    hasEditableText(activeNode.element) &&
    !activeNode.element.locked;
  const canDelete =
    !viewModeEnabled &&
    !!activeNode &&
    getDeletableIds(activeNode, tree.elementsById).length > 0;

  const usageHint =
    api && isPhone(api)
      ? "Tap an item to select it, then use the buttons above."
      : viewModeEnabled
      ? `Arrow keys move through items, Enter shows an item on the board, Space selects it. ${BOARD_OUTLINE_SHORTCUT} opens or closes this outline.`
      : `Arrow keys move through items, Enter shows an item on the board, Space selects it, F2 edits its text, Delete removes it. ${BOARD_OUTLINE_SHORTCUT} opens or closes this outline.`;

  return (
    <section
      id={BOARD_OUTLINE_REGION_ID}
      className="board-outline"
      aria-labelledby="board-outline-heading"
      onKeyDown={handlePanelKeyDown}
    >
      <header className="board-outline__header">
        <h2 id="board-outline-heading" className="board-outline__heading">
          Board outline
        </h2>
        <p className="board-outline__count">
          {tree.itemCount === 1 ? "1 item" : `${tree.itemCount} items`}
          {viewModeEnabled ? " · view only" : ""}
        </p>
        <p id="board-outline-hint" className="board-outline__hint">
          {usageHint}
        </p>
      </header>

      <div
        className="board-outline__actions"
        role="group"
        aria-label={
          activeDescription
            ? `Actions for ${activeDescription.title}`
            : "Item actions"
        }
      >
        <button
          type="button"
          disabled={!activeNode}
          onClick={() => activeNode && selectNode(activeNode)}
        >
          Select
        </button>
        <button
          type="button"
          disabled={!activeNode}
          onClick={() => activeNode && zoomToNode(activeNode)}
        >
          Zoom to
        </button>
        {!viewModeEnabled && (
          <>
            <button
              type="button"
              disabled={!canEditText}
              onClick={() => activeNode && editNodeText(activeNode)}
            >
              Edit text
            </button>
            <button
              type="button"
              className="board-outline__danger"
              disabled={!canDelete}
              onClick={() => activeNode && deleteNode(activeNode)}
            >
              Delete
            </button>
          </>
        )}
      </div>

      <p className="board-outline__status" role="status" aria-live="polite">
        {status}
      </p>

      {rows.length ? (
        <div
          ref={treeRef}
          className="board-outline__tree"
          role="tree"
          aria-label="Items on the board, top to bottom"
          aria-describedby="board-outline-hint"
          aria-multiselectable="true"
          tabIndex={activeIndex >= 0 ? -1 : 0}
          onKeyDown={handleTreeKeyDown}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <div
            role="none"
            className="board-outline__spacer"
            style={{ height: rows.length * ROW_HEIGHT }}
          >
            {renderedIndices.map((index) => {
              const row = rows[index];
              return (
                <OutlineTreeRow
                  key={row.node.key}
                  row={row}
                  index={index}
                  description={describe(row.node)}
                  isActive={index === activeIndex}
                  isSelected={isNodeSelected(row.node, selectedElementIds)}
                  isExpanded={!collapsedKeys.has(row.node.key)}
                  onActivate={activateRow}
                  onZoom={zoomToRow}
                  onToggle={toggleRow}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={treeRef}
          className="board-outline__empty"
          tabIndex={-1}
          role="note"
        >
          The board is empty. Pick a tool from the toolbar and draw, or add a
          sticky note. New items appear here in reading order.
        </div>
      )}

      <RecentActivity />
    </section>
  );
};

export const BoardOutlineTabTrigger = () => {
  const openSidebar = useSketchSyncStateValue("openSidebar");
  return (
    <Sidebar.TabTrigger
      tab={BOARD_OUTLINE_TAB}
      title={`Board outline (${BOARD_OUTLINE_SHORTCUT})`}
      aria-label="Board outline"
      style={{ opacity: openSidebar?.tab === BOARD_OUTLINE_TAB ? 1 : 0.4 }}
    >
      {outlineIcon}
    </Sidebar.TabTrigger>
  );
};

export const BoardOutlineTab = () => (
  <Sidebar.Tab tab={BOARD_OUTLINE_TAB} className="board-outline-tab">
    <BoardOutline />
  </Sidebar.Tab>
);
