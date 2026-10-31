import { viewportCoordsToSceneCoords } from "@sketchsync/common";

import type { Bounds } from "@sketchsync/common";

import type { Zoom } from "@sketchsync/editor/types";

import { getElementBounds } from "./bounds";
import { SpatialGrid } from "./spatialGrid";
import { isBoundToContainer } from "./typeChecks";

import type {
  SketchSyncElement,
  NonDeletedElementsMap,
  NonDeletedSketchSyncElement,
  NonDeletedSceneElementsMap,
} from "./types";

type IndexableElementsMap = NonDeletedElementsMap | NonDeletedSceneElementsMap;

export type SceneViewport = {
  zoom: Zoom;
  offsetLeft: number;
  offsetTop: number;
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
};

// Same arithmetic as isElementInViewport, so both agree to the last bit.
export const getViewportSceneBounds = (viewport: SceneViewport): Bounds => {
  const topLeft = viewportCoordsToSceneCoords(
    { clientX: viewport.offsetLeft, clientY: viewport.offsetTop },
    viewport,
  );
  const bottomRight = viewportCoordsToSceneCoords(
    {
      clientX: viewport.offsetLeft + viewport.width,
      clientY: viewport.offsetTop + viewport.height,
    },
    viewport,
  );
  return [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y];
};

type IndexedElement = {
  element: NonDeletedSketchSyncElement;
  version: number;
  // A label's bounds follow its container (e.g. a point on an arrow), which
  // can change without the label's own version changing.
  container: SketchSyncElement | null;
  containerVersion: number;
  order: number;
  lastSync: number;
  lastHit: number;
};

const getLabelContainer = (
  element: NonDeletedSketchSyncElement,
  elementsMap: IndexableElementsMap,
) =>
  isBoundToContainer(element)
    ? elementsMap.get(element.containerId) ?? null
    : null;

const hasChangedSinceIndexed = (entry: IndexedElement) =>
  entry.element.version !== entry.version ||
  (entry.container !== null &&
    entry.container.version !== entry.containerVersion);

export class ElementSpatialIndex {
  private readonly grid: SpatialGrid<IndexedElement>;
  private readonly entries = new Map<SketchSyncElement["id"], IndexedElement>();
  private inSceneOrder: IndexedElement[] = [];
  private syncedElementsMap: IndexableElementsMap | null = null;
  private syncCount = 0;
  private hitCount = 0;

  constructor(cellSize?: number) {
    this.grid = new SpatialGrid(cellSize);
  }

  get size() {
    return this.entries.size;
  }

  getVisibleElements(
    elementsMap: IndexableElementsMap,
    viewport: SceneViewport,
  ): NonDeletedSketchSyncElement[] {
    return this.getElementsInBounds(
      elementsMap,
      getViewportSceneBounds(viewport),
    );
  }

  getElementsInBounds(
    elementsMap: IndexableElementsMap,
    area: Bounds,
  ): NonDeletedSketchSyncElement[] {
    this.sync(elementsMap);
    const hits: IndexedElement[] = [];
    this.grid.search(area, (entry) => hits.push(entry));
    return this.sortIntoSceneOrder(hits);
  }

  sync(elementsMap: IndexableElementsMap) {
    if (elementsMap === this.syncedElementsMap) {
      this.reindexChangedElements(elementsMap);
      return;
    }
    this.reconcile(elementsMap);
    this.syncedElementsMap = elementsMap;
  }

  clear() {
    this.grid.clear();
    this.entries.clear();
    this.inSceneOrder = [];
    this.syncedElementsMap = null;
  }

  // Elements can be mutated in place (bumping their version) without the
  // map being rebuilt, so even an unchanged map gets this cheap version check.
  private reindexChangedElements(elementsMap: IndexableElementsMap) {
    for (const entry of this.inSceneOrder) {
      if (hasChangedSinceIndexed(entry)) {
        this.index(entry, entry.element, elementsMap);
      }
    }
  }

  private reconcile(elementsMap: IndexableElementsMap) {
    const syncId = ++this.syncCount;
    const previousOrder = this.inSceneOrder;
    const nextOrder: IndexedElement[] = [];

    for (const element of elementsMap.values()) {
      const order = nextOrder.length;
      // Most updates keep the order, so the same slot usually holds the
      // entry and the id lookup is skipped.
      const sameSlot = previousOrder[order];
      let entry =
        sameSlot?.element.id === element.id
          ? sameSlot
          : this.entries.get(element.id);

      if (!entry) {
        entry = {
          element,
          version: element.version,
          container: null,
          containerVersion: 0,
          order,
          lastSync: syncId,
          lastHit: 0,
        };
        this.entries.set(element.id, entry);
        this.index(entry, element, elementsMap);
      } else if (
        entry.element !== element ||
        entry.container !== getLabelContainer(element, elementsMap) ||
        hasChangedSinceIndexed(entry)
      ) {
        this.index(entry, element, elementsMap);
      }

      entry.order = order;
      entry.lastSync = syncId;
      nextOrder.push(entry);
    }

    this.inSceneOrder = nextOrder;

    if (this.entries.size > nextOrder.length) {
      for (const [id, entry] of this.entries) {
        if (entry.lastSync !== syncId) {
          this.grid.delete(entry);
          this.entries.delete(id);
        }
      }
    }
  }

  private index(
    entry: IndexedElement,
    element: NonDeletedSketchSyncElement,
    elementsMap: IndexableElementsMap,
  ) {
    const container = getLabelContainer(element, elementsMap);
    entry.element = element;
    entry.version = element.version;
    entry.container = container;
    entry.containerVersion = container?.version ?? 0;
    this.grid.set(entry, getElementBounds(element, elementsMap));
  }

  private sortIntoSceneOrder(hits: IndexedElement[]) {
    // Sorting k hits costs about k·log2(k); once that exceeds one pass over
    // all n elements (zoomed far out), the pass is cheaper.
    if (hits.length * Math.log2(hits.length) > this.inSceneOrder.length) {
      const hitId = ++this.hitCount;
      for (const entry of hits) {
        entry.lastHit = hitId;
      }
      const elements: NonDeletedSketchSyncElement[] = [];
      for (const entry of this.inSceneOrder) {
        if (entry.lastHit === hitId) {
          elements.push(entry.element);
        }
      }
      return elements;
    }

    hits.sort((a, b) => a.order - b.order);
    return hits.map((entry) => entry.element);
  }
}
