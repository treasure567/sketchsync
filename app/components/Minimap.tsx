import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyDarkModeFilter,
  isTransparent,
  isWritableElement,
  THEME,
} from "@sketchsync/common";
import {
  getElementBounds,
  getVisibleSceneBounds,
  hashElementsVersion,
  isFrameLikeElement,
  isFreeDrawElement,
  isIframeLikeElement,
  isImageElement,
  isLinearElement,
  isTextElement,
} from "@sketchsync/element";
import { t } from "@sketchsync/editor/i18n";
import { getShortcutKey } from "@sketchsync/editor/shortcut";

import type {
  ElementsMap,
  SketchSyncElement,
  SketchSyncFreeDrawElement,
  SketchSyncLinearElement,
} from "@sketchsync/element/types";
import type {
  AppState,
  SketchSyncImperativeAPI,
} from "@sketchsync/editor/types";

import "./Minimap.scss";

type Bounds = readonly [number, number, number, number];

type ViewportState = Pick<
  AppState,
  "scrollX" | "scrollY" | "zoom" | "width" | "height"
>;

export type MinimapMapping = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type ShapeBatch = {
  color: string;
  alpha: number;
  coords: number[];
};

type PathBatch = {
  color: string;
  alpha: number;
  polylines: number[][];
};

type PreparedScene = {
  bounds: Bounds | null;
  fills: Map<string, ShapeBatch>;
  outlines: Map<string, ShapeBatch>;
  filledOutlines: Map<string, ShapeBatch>;
  paths: Map<string, PathBatch>;
};

type MinimapLayout = {
  isPhone: boolean;
  isZenMode: boolean;
  isSidebarOpen: boolean;
  isBoardEmpty: boolean;
};

type DragState = {
  pointerId: number;
  mapping: MinimapMapping;
  grabX: number;
  grabY: number;
};

export const MINIMAP_WIDTH = 200;
export const MINIMAP_HEIGHT = 140;
const MINIMAP_INSET = 8;
const MAX_POLYLINE_POINTS = 24;
// rebuilding 10k shapes on every drag frame is the one cost that scales
// with the board, so it runs at most this often; the viewport still tracks every frame
const SCENE_REBUILD_INTERVAL_MS = 120;
const KEYBOARD_STEP = 0.25;
const TEXT_ALPHA = 0.45;
const MEDIA_ALPHA = 0.5;
const MEDIA_COLOR = "#868e96";
// below this size an outline covers the whole shape, so a dense board would
// turn into solid stroke colour; tiny shapes get a faint fill instead
const OUTLINE_MIN_SIZE_PX = 6;
const TINY_OUTLINE_ALPHA = 0.35;
const FALLBACK_PRIMARY = "#6965db";
const VISIBILITY_STORAGE_KEY = "sketchsync-minimap-visible";
const TOGGLE_SHORTCUT = "Alt+M";

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

// the editor handles keys on the document, so while the minimap has focus
// these would otherwise nudge, edit or delete the selection, or start panning
const KEYS_KEPT_FROM_EDITOR = new Set([
  ...Object.keys(ARROW_DIRECTIONS),
  "Enter",
  " ",
  "Delete",
  "Backspace",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const transparencyByColor = new Map<string, boolean>();

// colours repeat across thousands of elements, and parsing one is the
// slowest step of rebuilding the minimap
const isTransparentColor = (color: string) => {
  let transparent = transparencyByColor.get(color);
  if (transparent === undefined) {
    transparent = isTransparent(color);
    transparencyByColor.set(color, transparent);
  }
  return transparent;
};

const readStoredVisibility = () => {
  try {
    const stored = window.localStorage.getItem(VISIBILITY_STORAGE_KEY);
    return stored === null ? null : stored === "true";
  } catch {
    return null;
  }
};

const storeVisibility = (isVisible: boolean) => {
  try {
    window.localStorage.setItem(VISIBILITY_STORAGE_KEY, String(isVisible));
  } catch {
    // storage can be full or blocked; the toggle still works for this session
  }
};

const readLayout = (
  sketchsyncAPI: SketchSyncImperativeAPI,
  elements: readonly SketchSyncElement[],
  appState: AppState,
): MinimapLayout => ({
  isPhone: sketchsyncAPI.getEditorInterface().formFactor === "phone",
  isZenMode: appState.zenModeEnabled,
  isSidebarOpen: !!appState.openSidebar,
  // an empty board shows the welcome screen, whose help hint sits in this corner
  isBoardEmpty: !elements.some((element) => !element.isDeleted),
});

const isSameLayout = (a: MinimapLayout, b: MinimapLayout) =>
  a.isPhone === b.isPhone &&
  a.isZenMode === b.isZenMode &&
  a.isSidebarOpen === b.isSidebarOpen &&
  a.isBoardEmpty === b.isBoardEmpty;

const unionBounds = (a: Bounds | null, b: Bounds): Bounds =>
  a
    ? [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3]),
      ]
    : b;

export const getMinimapMapping = (
  sceneBounds: Bounds,
  width: number,
  height: number,
  inset: number = MINIMAP_INSET,
): MinimapMapping => {
  const sceneWidth = Math.max(sceneBounds[2] - sceneBounds[0], 1);
  const sceneHeight = Math.max(sceneBounds[3] - sceneBounds[1], 1);
  const scale = Math.min(
    (width - inset * 2) / sceneWidth,
    (height - inset * 2) / sceneHeight,
  );
  return {
    scale,
    offsetX: (width - sceneWidth * scale) / 2 - sceneBounds[0] * scale,
    offsetY: (height - sceneHeight * scale) / 2 - sceneBounds[1] * scale,
  };
};

export const minimapToScene = (
  mapping: MinimapMapping,
  x: number,
  y: number,
) => ({
  x: (x - mapping.offsetX) / mapping.scale,
  y: (y - mapping.offsetY) / mapping.scale,
});

export const getScrollToShowAt = (
  viewport: ViewportState,
  sceneX: number,
  sceneY: number,
  anchor: { x: number; y: number } = {
    x: viewport.width / viewport.zoom.value / 2,
    y: viewport.height / viewport.zoom.value / 2,
  },
) => ({
  scrollX: anchor.x - sceneX,
  scrollY: anchor.y - sceneY,
});

export const getScrollAfterKeyboardStep = (
  viewport: ViewportState,
  direction: { x: number; y: number },
  step: number,
) => ({
  scrollX:
    viewport.scrollX -
    (direction.x * step * viewport.width) / viewport.zoom.value,
  scrollY:
    viewport.scrollY -
    (direction.y * step * viewport.height) / viewport.zoom.value,
});

const getPolyline = (
  element: SketchSyncLinearElement | SketchSyncFreeDrawElement,
) => {
  const { points } = element;
  if (!points.length) {
    return [];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const centerX = element.x + (minX + maxX) / 2;
  const centerY = element.y + (minY + maxY) / 2;
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const step = Math.max(1, Math.ceil(points.length / MAX_POLYLINE_POINTS));

  const polyline: number[] = [];
  const pushPoint = ([x, y]: readonly [number, number]) => {
    const dx = element.x + x - centerX;
    const dy = element.y + y - centerY;
    polyline.push(centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos);
  };
  for (let index = 0; index < points.length; index += step) {
    pushPoint(points[index]);
  }
  if ((points.length - 1) % step !== 0) {
    pushPoint(points[points.length - 1]);
  }
  return polyline;
};

const prepareScene = (
  elements: readonly SketchSyncElement[],
  elementsMap: ElementsMap,
  isDarkTheme: boolean,
): PreparedScene => {
  const fills = new Map<string, ShapeBatch>();
  const outlines = new Map<string, ShapeBatch>();
  const filledOutlines = new Map<string, ShapeBatch>();
  const paths = new Map<string, PathBatch>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const themed = (color: string) =>
    isDarkTheme ? applyDarkModeFilter(color) : color;

  const addBox = (
    batches: Map<string, ShapeBatch>,
    color: string,
    alpha: number,
    bounds: Bounds,
  ) => {
    const key = `${color}|${alpha}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { color, alpha, coords: [] };
      batches.set(key, batch);
    }
    batch.coords.push(bounds[0], bounds[1], bounds[2], bounds[3]);
  };

  const addPolyline = (color: string, alpha: number, polyline: number[]) => {
    const key = `${color}|${alpha}`;
    let batch = paths.get(key);
    if (!batch) {
      batch = { color, alpha, polylines: [] };
      paths.set(key, batch);
    }
    batch.polylines.push(polyline);
  };

  for (const element of elements) {
    if (element.isDeleted) {
      continue;
    }
    const bounds = getElementBounds(element, elementsMap);
    if (!bounds.every(Number.isFinite)) {
      continue;
    }
    minX = Math.min(minX, bounds[0]);
    minY = Math.min(minY, bounds[1]);
    maxX = Math.max(maxX, bounds[2]);
    maxY = Math.max(maxY, bounds[3]);

    const alpha = element.opacity / 100;
    const strokeVisible = !isTransparentColor(element.strokeColor);

    if (isLinearElement(element) || isFreeDrawElement(element)) {
      if (strokeVisible) {
        addPolyline(themed(element.strokeColor), alpha, getPolyline(element));
      }
    } else if (isTextElement(element)) {
      addBox(fills, themed(element.strokeColor), alpha * TEXT_ALPHA, bounds);
    } else if (isImageElement(element) || isIframeLikeElement(element)) {
      addBox(fills, themed(MEDIA_COLOR), alpha * MEDIA_ALPHA, bounds);
    } else if (isFrameLikeElement(element)) {
      addBox(outlines, themed(element.strokeColor), alpha, bounds);
    } else {
      const isFilled = !isTransparentColor(element.backgroundColor);
      if (isFilled) {
        addBox(fills, themed(element.backgroundColor), alpha, bounds);
      }
      if (strokeVisible) {
        addBox(
          isFilled ? filledOutlines : outlines,
          themed(element.strokeColor),
          alpha,
          bounds,
        );
      }
    }
  }

  return {
    bounds: Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null,
    fills,
    outlines,
    filledOutlines,
    paths,
  };
};

const drawScene = (
  context: CanvasRenderingContext2D,
  scene: PreparedScene,
  mapping: MinimapMapping,
  background: string,
  pixelRatio: number,
) => {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.globalAlpha = 1;
  context.fillStyle = background;
  context.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

  const { scale, offsetX, offsetY } = mapping;
  context.setTransform(
    pixelRatio * scale,
    0,
    0,
    pixelRatio * scale,
    pixelRatio * offsetX,
    pixelRatio * offsetY,
  );
  const onePixel = 1 / scale;

  for (const batch of scene.fills.values()) {
    context.globalAlpha = batch.alpha;
    context.fillStyle = batch.color;
    context.beginPath();
    const { coords } = batch;
    for (let i = 0; i < coords.length; i += 4) {
      context.rect(
        coords[i],
        coords[i + 1],
        Math.max(coords[i + 2] - coords[i], onePixel),
        Math.max(coords[i + 3] - coords[i + 1], onePixel),
      );
    }
    context.fill();
  }

  context.lineWidth = onePixel;
  context.lineJoin = "round";
  context.lineCap = "round";

  const minOutlineSize = OUTLINE_MIN_SIZE_PX * onePixel;
  const traceBoxes = (batch: ShapeBatch, isLarge: boolean) => {
    context.beginPath();
    const { coords } = batch;
    for (let i = 0; i < coords.length; i += 4) {
      const width = coords[i + 2] - coords[i];
      const height = coords[i + 3] - coords[i + 1];
      if ((width >= minOutlineSize || height >= minOutlineSize) === isLarge) {
        context.rect(
          coords[i],
          coords[i + 1],
          Math.max(width, onePixel),
          Math.max(height, onePixel),
        );
      }
    }
  };

  for (const batch of scene.outlines.values()) {
    context.globalAlpha = batch.alpha * TINY_OUTLINE_ALPHA;
    context.fillStyle = batch.color;
    traceBoxes(batch, false);
    context.fill();
  }
  for (const batches of [scene.outlines, scene.filledOutlines]) {
    for (const batch of batches.values()) {
      context.globalAlpha = batch.alpha;
      context.strokeStyle = batch.color;
      traceBoxes(batch, true);
      context.stroke();
    }
  }

  for (const batch of scene.paths.values()) {
    context.globalAlpha = batch.alpha;
    context.strokeStyle = batch.color;
    context.beginPath();
    for (const polyline of batch.polylines) {
      if (polyline.length < 2) {
        continue;
      }
      context.moveTo(polyline[0], polyline[1]);
      if (polyline.length === 2) {
        context.lineTo(polyline[0] + onePixel, polyline[1]);
      }
      for (let i = 2; i < polyline.length; i += 2) {
        context.lineTo(polyline[i], polyline[i + 1]);
      }
    }
    context.stroke();
  }
};

const drawViewport = (
  context: CanvasRenderingContext2D,
  viewportBounds: Bounds,
  mapping: MinimapMapping,
  color: string,
  pixelRatio: number,
) => {
  const { scale, offsetX, offsetY } = mapping;
  const x = viewportBounds[0] * scale + offsetX;
  const y = viewportBounds[1] * scale + offsetY;
  const width = (viewportBounds[2] - viewportBounds[0]) * scale;
  const height = (viewportBounds[3] - viewportBounds[1]) * scale;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.globalAlpha = 0.12;
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
  context.globalAlpha = 1;
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.strokeRect(x, y, width, height);
};

const readCssColor = (node: Element, name: string, fallback: string) => {
  const value = node.ownerDocument.defaultView
    ?.getComputedStyle(node)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const createMinimapRenderer = (canvas: HTMLCanvasElement) => {
  const ownerWindow = canvas.ownerDocument.defaultView ?? window;
  const sceneLayer = canvas.ownerDocument.createElement("canvas");
  const context = canvas.getContext("2d");
  const layerContext = sceneLayer.getContext("2d");

  let latest: {
    elements: readonly SketchSyncElement[];
    elementsMap: ElementsMap;
    appState: AppState;
  } | null = null;
  let scene: PreparedScene | null = null;
  let sceneHash: number | null = null;
  let sceneIsDark = false;
  let sceneBuiltAt = -Infinity;
  let sceneVersion = 0;
  let layerKey = "";
  let frameKey = "";
  let mapping: MinimapMapping | null = null;
  let frozenMapping: MinimapMapping | null = null;
  let frameRequest: number | null = null;
  let rebuildTimer: number | null = null;
  let pixelRatio = 0;
  let themeColors: { isDark: boolean; primary: string; island: string } | null =
    null;

  const getThemeColors = (isDark: boolean) => {
    // reading CSS variables forces a style recalc, so only on theme changes
    if (themeColors?.isDark !== isDark) {
      themeColors = {
        isDark,
        primary: readCssColor(canvas, "--color-primary", FALLBACK_PRIMARY),
        island: readCssColor(canvas, "--island-bg-color", "#ffffff"),
      };
    }
    return themeColors;
  };

  const resize = () => {
    const nextPixelRatio = ownerWindow.devicePixelRatio || 1;
    if (nextPixelRatio === pixelRatio) {
      return;
    }
    pixelRatio = nextPixelRatio;
    for (const target of [canvas, sceneLayer]) {
      target.width = Math.round(MINIMAP_WIDTH * pixelRatio);
      target.height = Math.round(MINIMAP_HEIGHT * pixelRatio);
    }
    layerKey = "";
    frameKey = "";
  };

  const render = () => {
    frameRequest = null;
    if (!latest || !context || !layerContext) {
      return;
    }
    resize();
    const { elements, elementsMap, appState } = latest;
    const isDark = appState.theme === THEME.DARK;
    const nextHash = hashElementsVersion(elements);

    if (!scene || nextHash !== sceneHash || isDark !== sceneIsDark) {
      const sinceLastBuild = ownerWindow.performance.now() - sceneBuiltAt;
      if (scene && sinceLastBuild < SCENE_REBUILD_INTERVAL_MS) {
        if (rebuildTimer === null) {
          rebuildTimer = ownerWindow.setTimeout(() => {
            rebuildTimer = null;
            schedule();
          }, SCENE_REBUILD_INTERVAL_MS - sinceLastBuild);
        }
      } else {
        scene = prepareScene(elements, elementsMap, isDark);
        sceneHash = nextHash;
        sceneIsDark = isDark;
        sceneBuiltAt = ownerWindow.performance.now();
        sceneVersion++;
      }
    }

    const viewportBounds = getVisibleSceneBounds(appState);
    mapping =
      frozenMapping ??
      getMinimapMapping(
        unionBounds(scene.bounds, viewportBounds),
        MINIMAP_WIDTH,
        MINIMAP_HEIGHT,
      );

    const colors = getThemeColors(isDark);
    const background = isTransparentColor(appState.viewBackgroundColor)
      ? colors.island
      : isDark
      ? applyDarkModeFilter(appState.viewBackgroundColor)
      : appState.viewBackgroundColor;
    const nextLayerKey = `${sceneVersion}|${mapping.scale}|${mapping.offsetX}|${mapping.offsetY}|${background}|${pixelRatio}`;
    const nextFrameKey = `${nextLayerKey}|${viewportBounds.join(
      ",",
    )}|${isDark}`;
    if (nextFrameKey === frameKey) {
      return;
    }
    frameKey = nextFrameKey;

    if (nextLayerKey !== layerKey) {
      layerKey = nextLayerKey;
      drawScene(layerContext, scene, mapping, background, pixelRatio);
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sceneLayer, 0, 0);
    drawViewport(context, viewportBounds, mapping, colors.primary, pixelRatio);
  };

  const schedule = () => {
    if (frameRequest === null) {
      frameRequest = ownerWindow.requestAnimationFrame(render);
    }
  };

  return {
    update: (
      elements: readonly SketchSyncElement[],
      elementsMap: ElementsMap,
      appState: AppState,
    ) => {
      latest = { elements, elementsMap, appState };
      schedule();
    },
    getMapping: () => mapping,
    freezeMapping: (nextMapping: MinimapMapping | null) => {
      frozenMapping = nextMapping;
      schedule();
    },
    destroy: () => {
      if (frameRequest !== null) {
        ownerWindow.cancelAnimationFrame(frameRequest);
      }
      if (rebuildTimer !== null) {
        ownerWindow.clearTimeout(rebuildTimer);
      }
      latest = null;
    },
  };
};

const MinimapIcon = (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="11" y="11" width="7" height="6" rx="1" />
  </svg>
);

export const Minimap = ({
  sketchsyncAPI,
}: {
  sketchsyncAPI: SketchSyncImperativeAPI;
}) => {
  const [layout, setLayout] = useState(() =>
    readLayout(
      sketchsyncAPI,
      sketchsyncAPI.getSceneElementsIncludingDeleted(),
      sketchsyncAPI.getAppState(),
    ),
  );
  const [isVisible, setIsVisible] = useState(
    () =>
      readStoredVisibility() ??
      sketchsyncAPI.getEditorInterface().formFactor !== "phone",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createMinimapRenderer> | null>(
    null,
  );
  const dragRef = useRef<DragState | null>(null);

  useEffect(
    () =>
      sketchsyncAPI.onChange((elements, appState) => {
        const nextLayout = readLayout(sketchsyncAPI, elements, appState);
        setLayout((layout) =>
          isSameLayout(layout, nextLayout) ? layout : nextLayout,
        );
      }),
    [sketchsyncAPI],
  );

  const isHidden = layout.isPhone || layout.isZenMode || layout.isBoardEmpty;
  const isShown = isVisible && !isHidden;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isShown || !canvas) {
      return;
    }
    const renderer = createMinimapRenderer(canvas);
    rendererRef.current = renderer;
    renderer.update(
      sketchsyncAPI.getSceneElementsIncludingDeleted(),
      sketchsyncAPI.getSceneElementsMapIncludingDeleted(),
      sketchsyncAPI.getAppState(),
    );
    const unsubscribe = sketchsyncAPI.onChange((elements, appState) => {
      renderer.update(
        elements,
        sketchsyncAPI.getSceneElementsMapIncludingDeleted(),
        appState,
      );
    });
    return () => {
      unsubscribe();
      renderer.destroy();
      rendererRef.current = null;
      dragRef.current = null;
    };
  }, [sketchsyncAPI, isShown]);

  const toggle = useCallback(() => {
    setIsVisible(!isVisible);
    storeVisibility(!isVisible);
  }, [isVisible]);

  useEffect(() => {
    const ownerDocument = rootRef.current?.ownerDocument;
    if (!ownerDocument || isHidden) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== "KeyM" ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isWritableElement(event.target)
      ) {
        return;
      }
      event.preventDefault();
      toggle();
    };
    ownerDocument.addEventListener("keydown", onKeyDown);
    return () => ownerDocument.removeEventListener("keydown", onKeyDown);
  }, [toggle, isHidden]);

  const getPointerScenePoint = (
    event: React.PointerEvent<HTMLCanvasElement>,
    mapping: MinimapMapping,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return minimapToScene(
      mapping,
      ((event.clientX - rect.left) * MINIMAP_WIDTH) / rect.width,
      ((event.clientY - rect.top) * MINIMAP_HEIGHT) / rect.height,
    );
  };

  const scrollToShow = (sceneX: number, sceneY: number, drag: DragState) => {
    sketchsyncAPI.updateScene({
      appState: getScrollToShowAt(sketchsyncAPI.getAppState(), sceneX, sceneY, {
        x: drag.grabX,
        y: drag.grabY,
      }),
    });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const mapping = rendererRef.current?.getMapping();
    if (event.button !== 0 || !mapping) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });

    const appState = sketchsyncAPI.getAppState();
    const point = getPointerScenePoint(event, mapping);
    const [left, top, right, bottom] = getVisibleSceneBounds(appState);
    const isOnViewport =
      point.x >= left &&
      point.x <= right &&
      point.y >= top &&
      point.y <= bottom;

    const drag: DragState = {
      pointerId: event.pointerId,
      mapping,
      grabX: isOnViewport ? point.x - left : (right - left) / 2,
      grabY: isOnViewport ? point.y - top : (bottom - top) / 2,
    };
    dragRef.current = drag;
    rendererRef.current?.freezeMapping(mapping);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!isOnViewport) {
      scrollToShow(point.x, point.y, drag);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const point = getPointerScenePoint(event, drag.mapping);
    scrollToShow(point.x, point.y, drag);
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    rendererRef.current?.freezeMapping(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      !KEYS_KEPT_FROM_EDITOR.has(event.key)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction || event.altKey) {
      return;
    }
    sketchsyncAPI.updateScene({
      appState: getScrollAfterKeyboardStep(
        sketchsyncAPI.getAppState(),
        direction,
        event.shiftKey ? 1 : KEYBOARD_STEP,
      ),
    });
  };

  if (isHidden) {
    return null;
  }

  const toggleLabel = isVisible ? t("minimap.hide") : t("minimap.show");

  return (
    <div
      ref={rootRef}
      className={clsx("sketchsync-minimap", {
        "sketchsync-minimap--sidebar-open": layout.isSidebarOpen,
      })}
    >
      {isVisible && (
        <canvas
          ref={canvasRef}
          className="sketchsync-minimap__canvas"
          role="img"
          aria-label={t("minimap.canvasLabel")}
          tabIndex={0}
          style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        />
      )}
      <button
        type="button"
        className="sketchsync-minimap__toggle"
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        title={`${toggleLabel} — ${getShortcutKey(TOGGLE_SHORTCUT)}`}
        onClick={toggle}
      >
        {MinimapIcon}
      </button>
    </div>
  );
};
