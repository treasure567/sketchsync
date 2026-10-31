import { arrayToMap, toBrandedType } from "@sketchsync/common";
import { pointFrom } from "@sketchsync/math";
import { API } from "@sketchsync/editor/tests/helpers/api";

import type { Bounds } from "@sketchsync/common";
import type { LocalPoint, Radians } from "@sketchsync/math";
import type { NormalizedZoomValue } from "@sketchsync/editor/types";

import * as BoundsModule from "../src/bounds";
import {
  ElementSpatialIndex,
  getViewportSceneBounds,
} from "../src/elementSpatialIndex";
import { mutateElement, newElementWith } from "../src/mutateElement";
import { Scene } from "../src/Scene";
import { isElementInViewport } from "../src/sizeHelpers";
import { boundsIntersect, SpatialGrid } from "../src/spatialGrid";

import { createMixedScene, createRandom } from "./helpers/mixedScene";

import type { SceneViewport } from "../src/elementSpatialIndex";
import type {
  NonDeletedElementsMap,
  NonDeletedSketchSyncElement,
} from "../src/types";

const toMap = (elements: readonly NonDeletedSketchSyncElement[]) =>
  toBrandedType<NonDeletedElementsMap>(arrayToMap(elements));

const viewport = (overrides: Partial<SceneViewport> = {}): SceneViewport => ({
  zoom: { value: 1 as NormalizedZoomValue },
  offsetLeft: 0,
  offsetTop: 0,
  scrollX: 0,
  scrollY: 0,
  width: 1000,
  height: 800,
  ...overrides,
});

const linearFilter = (
  elementsMap: NonDeletedElementsMap,
  view: SceneViewport,
) =>
  [...elementsMap.values()].filter((element) =>
    isElementInViewport(element, view.width, view.height, view, elementsMap),
  );

const ids = (elements: readonly { id: string }[]) =>
  elements.map((element) => element.id);

describe("SpatialGrid", () => {
  const searchAll = <T>(grid: SpatialGrid<T>, area: Bounds) => {
    const found: T[] = [];
    grid.search(area, (item) => found.push(item));
    return found;
  };

  it("finds only the items whose bounds intersect the area", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("a", [0, 0, 10, 10]);
    grid.set("b", [100, 100, 120, 120]);
    grid.set("c", [-500, -500, -400, -400]);

    expect(searchAll(grid, [-5, -5, 50, 50])).toEqual(["a"]);
    expect(searchAll(grid, [0, 0, 1000, 1000]).sort()).toEqual(["a", "b"]);
    expect(searchAll(grid, [200, 200, 300, 300])).toEqual([]);
  });

  it("treats touching edges as intersecting, also on cell borders", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("left", [0, 0, 64, 64]);
    grid.set("right", [128, 0, 192, 64]);

    expect(searchAll(grid, [64, 10, 64, 20])).toEqual(["left"]);
    expect(searchAll(grid, [100, 64, 128, 100])).toEqual(["right"]);
    expect(searchAll(grid, [64.0001, 0, 127.9999, 64])).toEqual([]);
  });

  it("visits an item that spans many cells once", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("wide", [0, 0, 640, 640]);

    expect(searchAll(grid, [-1000, -1000, 1000, 1000])).toEqual(["wide"]);
  });

  it("moves an item on update and frees the cells it left", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("a", [0, 0, 10, 10]);
    expect(grid.occupiedCellCount).toBe(1);

    grid.set("a", [1000, 1000, 1010, 1010]);
    expect(searchAll(grid, [0, 0, 100, 100])).toEqual([]);
    expect(searchAll(grid, [990, 990, 1001, 1001])).toEqual(["a"]);
    expect(grid.size).toBe(1);
    expect(grid.occupiedCellCount).toBe(1);

    grid.set("a", [1001, 1001, 1011, 1011]);
    expect(grid.getBounds("a")).toEqual([1001, 1001, 1011, 1011]);
  });

  it("removes items", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("a", [0, 0, 10, 10]);
    grid.set("huge", [-1e6, -1e6, 1e6, 1e6]);

    expect(grid.delete("a")).toBe(true);
    expect(grid.delete("a")).toBe(false);
    expect(grid.delete("huge")).toBe(true);
    expect(searchAll(grid, [-10, -10, 10, 10])).toEqual([]);
    expect(grid.size).toBe(0);
    expect(grid.occupiedCellCount).toBe(0);
  });

  it("keeps oversized and non-finite items correct without filling cells", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("huge", [-1e6, -1e6, 1e6, 1e6]);
    grid.set("everywhere", [-Infinity, -Infinity, Infinity, Infinity]);
    grid.set("broken", [NaN, NaN, NaN, NaN]);
    grid.set("far", [1e300, 1e300, 1e300 + 1, 1e300 + 1]);

    expect(grid.occupiedCellCount).toBe(0);
    expect(searchAll(grid, [0, 0, 1, 1]).sort()).toEqual([
      "everywhere",
      "huge",
    ]);
    expect(searchAll(grid, [1e300, 1e300, 1e300, 1e300]).sort()).toEqual([
      "everywhere",
      "far",
    ]);
  });

  it("returns nothing for a NaN area and does not hang on far-away areas", () => {
    const grid = new SpatialGrid<string>(64);
    grid.set("a", [0, 0, 10, 10]);

    expect(searchAll(grid, [NaN, NaN, NaN, NaN])).toEqual([]);
    expect(searchAll(grid, [1e300, 1e300, 1e300, 1e300])).toEqual([]);
    expect(searchAll(grid, [-Infinity, -Infinity, -Infinity, -1])).toEqual([]);
    expect(searchAll(grid, [-Infinity, -Infinity, Infinity, Infinity])).toEqual(
      ["a"],
    );
  });

  it("rejects cell sizes that are not powers of two", () => {
    expect(() => new SpatialGrid(500)).toThrow();
    expect(() => new SpatialGrid(0)).toThrow();
    expect(() => new SpatialGrid(256)).not.toThrow();
  });

  it("matches a brute-force scan on random data", () => {
    const random = createRandom(7);
    const grid = new SpatialGrid<number>(128);
    const all = new Map<number, Bounds>();
    const randomBounds = (): Bounds => {
      const x = (random() - 0.5) * 20_000;
      const y = (random() - 0.5) * 20_000;
      const size = random() < 0.05 ? random() * 50_000 : random() * 400;
      return [x, y, x + size * random(), y + size * random()];
    };

    for (let i = 0; i < 2000; i++) {
      const bounds = randomBounds();
      grid.set(i, bounds);
      all.set(i, bounds);
    }
    for (let i = 0; i < 2000; i += 3) {
      const bounds = randomBounds();
      grid.set(i, bounds);
      all.set(i, bounds);
    }
    for (let i = 1; i < 2000; i += 7) {
      grid.delete(i);
      all.delete(i);
    }

    for (let i = 0; i < 200; i++) {
      const [x, y] = randomBounds();
      const extent = random() < 0.1 ? 40_000 : 2_000;
      const area: Bounds = [x, y, x + extent, y + extent * 0.6];
      const expected = [...all]
        .filter(([, bounds]) => boundsIntersect(area, bounds))
        .map(([item]) => item);
      expect(searchAll(grid, area).sort((a, b) => a - b)).toEqual(expected);
    }
  });
});

describe("ElementSpatialIndex", () => {
  it("returns the same elements in the same order as the linear viewport filter", () => {
    const elements = createMixedScene({ count: 3000, seed: 3 });
    const elementsMap = toMap(elements);
    const index = new ElementSpatialIndex();
    const random = createRandom(11);

    for (let i = 0; i < 60; i++) {
      const view = viewport({
        zoom: {
          value: (random() < 0.2
            ? 0.1
            : 0.4 + random() * 2) as NormalizedZoomValue,
        },
        scrollX: (random() - 0.5) * 20_000,
        scrollY: (random() - 0.5) * 20_000,
        offsetLeft: random() < 0.5 ? 0 : 120,
        offsetTop: random() < 0.5 ? 0 : 60,
        width: 400 + random() * 1600,
        height: 300 + random() * 900,
      });
      const visible = index.getVisibleElements(elementsMap, view);
      const expected = linearFilter(elementsMap, view);
      expect(visible.length).toBe(expected.length);
      expect(ids(visible)).toEqual(ids(expected));
    }
  });

  it("uses the same viewport edges as isElementInViewport", () => {
    const view = viewport({
      zoom: { value: 0.5 as NormalizedZoomValue },
      offsetLeft: 17,
      offsetTop: 9,
      scrollX: 123,
      scrollY: -98,
    });
    const [x1, y1, x2, y2] = getViewportSceneBounds(view);
    const touching = [
      API.createElement({ x: x2, y: y1, width: 10, height: 10 }),
      API.createElement({ x: x1 - 10, y: y2, width: 10, height: 10 }),
    ];
    const elementsMap = toMap(touching);

    expect(ids(linearFilter(elementsMap, view))).toEqual(ids(touching));
    expect(
      ids(new ElementSpatialIndex().getVisibleElements(elementsMap, view)),
    ).toEqual(ids(touching));
  });

  it("adds elements that appear in the next map", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const b = API.createElement({ id: "b", x: 300, y: 10 });
    const index = new ElementSpatialIndex();

    expect(ids(index.getVisibleElements(toMap([a]), viewport()))).toEqual([
      "a",
    ]);
    expect(ids(index.getVisibleElements(toMap([a, b]), viewport()))).toEqual([
      "a",
      "b",
    ]);
    expect(index.size).toBe(2);
  });

  it("removes elements that are missing from the next map", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const b = API.createElement({ id: "b", x: 300, y: 10 });
    const index = new ElementSpatialIndex();
    index.sync(toMap([a, b]));

    expect(ids(index.getVisibleElements(toMap([b]), viewport()))).toEqual([
      "b",
    ]);
    expect(index.size).toBe(1);
  });

  it("drops deleted elements once the scene no longer lists them", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const b = API.createElement({ id: "b", x: 300, y: 10 });
    const scene = new Scene([a, b], { skipValidation: true });
    const index = new ElementSpatialIndex();
    index.sync(scene.getNonDeletedElementsMap());

    scene.replaceAllElements([{ ...a, isDeleted: true }, b], {
      skipValidation: true,
    });

    expect(
      ids(
        index.getVisibleElements(scene.getNonDeletedElementsMap(), viewport()),
      ),
    ).toEqual(["b"]);
    expect(index.size).toBe(1);
  });

  it("follows an element mutated in place, even when the map is not rebuilt", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const elementsMap = toMap([a]);
    const index = new ElementSpatialIndex();
    expect(ids(index.getVisibleElements(elementsMap, viewport()))).toEqual([
      "a",
    ]);

    mutateElement(a, elementsMap, { x: 5000 });

    expect(index.getVisibleElements(elementsMap, viewport())).toEqual([]);
    expect(
      ids(index.getVisibleElements(elementsMap, viewport({ scrollX: -4900 }))),
    ).toEqual(["a"]);
  });

  it("follows an element replaced by a new object with the same version", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const index = new ElementSpatialIndex();
    index.sync(toMap([a]));

    const moved = { ...a, x: 5000 };

    expect(index.getVisibleElements(toMap([moved]), viewport())).toEqual([]);
  });

  it("recomputes bounds only for elements that changed", () => {
    const elements = createMixedScene({ count: 500, seed: 5 }).filter(
      (element) => !("containerId" in element && element.containerId),
    );
    const index = new ElementSpatialIndex();
    index.sync(toMap(elements));

    const target = elements[42];
    mutateElement(target, toMap(elements), { x: target.x + 10 });
    const getBounds = vi.spyOn(BoundsModule, "getElementBounds");
    try {
      index.sync(toMap(elements));
      expect(getBounds).toHaveBeenCalledTimes(1);
      expect(getBounds.mock.calls[0][0]).toBe(target);

      index.sync(toMap(elements));
      expect(getBounds).toHaveBeenCalledTimes(1);
    } finally {
      getBounds.mockRestore();
    }
  });

  it("keeps z-order when elements are reordered", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const b = API.createElement({ id: "b", x: 20, y: 20 });
    const c = API.createElement({ id: "c", x: 30, y: 30 });
    const index = new ElementSpatialIndex();

    expect(ids(index.getVisibleElements(toMap([a, b, c]), viewport()))).toEqual(
      ["a", "b", "c"],
    );
    expect(ids(index.getVisibleElements(toMap([c, a, b]), viewport()))).toEqual(
      ["c", "a", "b"],
    );
  });

  it("uses rotated bounds", () => {
    // A tall thin bar left of the viewport. Turned by 90° around its center
    // it lies flat and reaches into the viewport.
    const bar = API.createElement({
      id: "bar",
      x: -305,
      y: -250,
      width: 10,
      height: 1000,
    });
    const turnedBar = { ...bar, angle: (Math.PI / 2) as Radians };
    const index = new ElementSpatialIndex();

    expect(index.getVisibleElements(toMap([bar]), viewport())).toEqual([]);
    expect(
      ids(index.getVisibleElements(toMap([turnedBar]), viewport())),
    ).toEqual(["bar"]);
    expect(ids(linearFilter(toMap([turnedBar]), viewport()))).toEqual(["bar"]);
  });

  it("uses the points of linear and freedraw elements", () => {
    const farPoints = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(3000, 0),
    ];
    const arrow = API.createElement({
      type: "arrow",
      id: "arrow",
      x: -2000,
      y: 100,
      points: farPoints,
    });
    const line = API.createElement({
      type: "line",
      id: "line",
      x: -2000,
      y: 200,
      points: farPoints,
    });
    const freedraw = API.createElement({
      type: "freedraw",
      id: "freedraw",
      x: -2000,
      y: 300,
      points: farPoints,
    });
    const elementsMap = toMap([arrow, line, freedraw]);
    const index = new ElementSpatialIndex();

    expect(ids(index.getVisibleElements(elementsMap, viewport()))).toEqual([
      "arrow",
      "line",
      "freedraw",
    ]);

    mutateElement(arrow, elementsMap, {
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
    });

    expect(ids(index.getVisibleElements(elementsMap, viewport()))).toEqual([
      "line",
      "freedraw",
    ]);
    expect(ids(linearFilter(elementsMap, viewport()))).toEqual([
      "line",
      "freedraw",
    ]);
  });

  it("moves an arrow label with its arrow although the label is unchanged", () => {
    const label = API.createElement({
      type: "text",
      id: "label",
      width: 60,
      height: 25,
      containerId: "arrow",
    });
    const arrow = API.createElement({
      type: "arrow",
      id: "arrow",
      x: 100,
      y: 100,
      points: [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(200, 0)],
      boundElements: [{ type: "text", id: label.id }],
    });
    const elementsMap = toMap([arrow, label]);
    const index = new ElementSpatialIndex();
    expect(ids(index.getVisibleElements(elementsMap, viewport()))).toEqual([
      "arrow",
      "label",
    ]);

    const labelVersion = label.version;
    mutateElement(arrow, elementsMap, { x: 5000 });
    expect(label.version).toBe(labelVersion);

    expect(index.getVisibleElements(elementsMap, viewport())).toEqual([]);
    const atArrow = viewport({ scrollX: -5000 });
    expect(ids(index.getVisibleElements(elementsMap, atArrow))).toEqual(
      ids(linearFilter(elementsMap, atArrow)),
    );
    expect(ids(index.getVisibleElements(elementsMap, atArrow))).toContain(
      "label",
    );
  });

  it("stays in sync with the linear filter through random edits", () => {
    const elements = createMixedScene({ count: 1500, seed: 9 });
    const random = createRandom(13);
    const index = new ElementSpatialIndex();
    let current = [...elements];

    for (let step = 0; step < 40; step++) {
      const action = random();
      const target = current[Math.floor(random() * current.length)];
      if (action < 0.4) {
        mutateElement(target, toMap(current), {
          x: target.x + (random() - 0.5) * 3000,
          y: target.y + (random() - 0.5) * 3000,
        });
      } else if (action < 0.6) {
        current = current.map((element) =>
          element === target
            ? newElementWith(element, {
                angle: (random() * Math.PI) as Radians,
              })
            : element,
        );
      } else if (action < 0.75) {
        current = current.filter((element) => element !== target);
      } else if (action < 0.9) {
        current = [
          ...current,
          API.createElement({
            x: (random() - 0.5) * 20_000,
            y: (random() - 0.5) * 20_000,
          }),
        ];
      } else {
        const from = Math.floor(random() * current.length);
        const [moved] = current.splice(from, 1);
        current.splice(Math.floor(random() * current.length), 0, moved);
      }

      const elementsMap = toMap(current);
      const view = viewport({
        zoom: { value: (0.2 + random()) as NormalizedZoomValue },
        scrollX: (random() - 0.5) * 15_000,
        scrollY: (random() - 0.5) * 15_000,
      });
      expect(ids(index.getVisibleElements(elementsMap, view))).toEqual(
        ids(linearFilter(elementsMap, view)),
      );
      expect(index.size).toBe(current.length);
    }
  });
});
