import { arrayToMap, toBrandedType } from "@sketchsync/common";
import { bench, describe } from "vitest";

import type { NormalizedZoomValue } from "@sketchsync/editor/types";

import { Renderer } from "../../editor/scene/Renderer";
import { getDefaultAppState } from "../../editor/appState";
import { ElementSpatialIndex } from "../src/elementSpatialIndex";
import { Scene } from "../src/Scene";
import { isElementInViewport } from "../src/sizeHelpers";

import { createMixedScene } from "./helpers/mixedScene";

import type { SceneViewport } from "../src/elementSpatialIndex";
import type {
  NonDeletedElementsMap,
  NonDeletedSketchSyncElement,
} from "../src/types";

const ELEMENT_COUNT = 10_000;
const PAN_STEP = 25;
const BENCH_OPTIONS = { time: 1500, warmupTime: 300 };

const elements = createMixedScene({ count: ELEMENT_COUNT, seed: 1 });

const toMap = (list: readonly NonDeletedSketchSyncElement[]) =>
  toBrandedType<NonDeletedElementsMap>(arrayToMap(list));

const linearFilter = (
  elementsMap: NonDeletedElementsMap,
  view: SceneViewport,
) => {
  const visible: NonDeletedSketchSyncElement[] = [];
  for (const element of elementsMap.values()) {
    if (
      isElementInViewport(element, view.width, view.height, view, elementsMap)
    ) {
      visible.push(element);
    }
  }
  return visible;
};

// What Renderer did before the index on every pan frame and scene change:
// rebuild the renderable map, then test every element against the viewport.
const previousRendererFrame = (scene: Scene, view: SceneViewport) => {
  const elementsMap = toBrandedType<NonDeletedElementsMap>(new Map());
  for (const element of scene.getNonDeletedElements()) {
    elementsMap.set(element.id, element);
  }
  return linearFilter(elementsMap, view);
};

const createPan = (zoom: number) => {
  let frame = 0;
  return (): SceneViewport => {
    frame = (frame + 1) % 400;
    return {
      zoom: { value: zoom as NormalizedZoomValue },
      offsetLeft: 0,
      offsetTop: 0,
      scrollX: 5000 - frame * PAN_STEP,
      scrollY: 2000 - frame * (PAN_STEP / 2),
      width: 1920,
      height: 1080,
    };
  };
};

const elementsMap = toMap(elements);
const syncedIndex = new ElementSpatialIndex();
syncedIndex.sync(elementsMap);
linearFilter(elementsMap, createPan(1)());

for (const zoom of [1, 0.25, 0.1]) {
  describe(`visible set while panning at ${zoom * 100}% zoom`, () => {
    const nextView = createPan(zoom);
    console.info(
      `[${zoom * 100}% zoom] visible elements in a 1920x1080 viewport:`,
      linearFilter(elementsMap, nextView()).length,
    );

    bench(
      "before: linear filter",
      () => {
        linearFilter(elementsMap, nextView());
      },
      BENCH_OPTIONS,
    );

    bench(
      "after: spatial index",
      () => {
        syncedIndex.getVisibleElements(elementsMap, nextView());
      },
      BENCH_OPTIONS,
    );
  });
}

describe("renderer frame while panning at 100% zoom", () => {
  const scene = new Scene(elements, { skipValidation: true });
  const renderer = new Renderer(scene);
  const appState = getDefaultAppState();
  const nextView = createPan(1);

  bench(
    "before: rebuild map + linear filter",
    () => {
      previousRendererFrame(scene, nextView());
    },
    BENCH_OPTIONS,
  );

  bench(
    "after: Renderer.getRenderableElements",
    () => {
      renderer.getRenderableElements({
        ...appState,
        ...nextView(),
        selectedElements: [],
      });
    },
    BENCH_OPTIONS,
  );
});

describe("renderer frame after one element moves", () => {
  const scene = new Scene(elements, { skipValidation: true });
  const renderer = new Renderer(scene);
  const appState = getDefaultAppState();
  const view = createPan(1)();
  const moving = scene.getNonDeletedElements()[ELEMENT_COUNT / 2];
  let direction = 1;
  const moveOneElement = () => {
    direction = -direction;
    scene.mutateElement(moving, { x: moving.x + direction * 10 });
  };

  bench(
    "before: rebuild map + linear filter",
    () => {
      moveOneElement();
      previousRendererFrame(scene, view);
    },
    BENCH_OPTIONS,
  );

  bench(
    "after: Renderer.getRenderableElements",
    () => {
      moveOneElement();
      renderer.getRenderableElements({
        ...appState,
        ...view,
        selectedElements: [],
      });
    },
    BENCH_OPTIONS,
  );
});

describe("index upkeep for 10,000 elements", () => {
  const moving = elements[ELEMENT_COUNT / 2];
  const withMovedElement = (dx: number) =>
    toMap(
      elements.map((element) =>
        element === moving ? { ...moving, x: moving.x + dx } : element,
      ),
    );
  const movedLeft = withMovedElement(-10);
  const movedRight = withMovedElement(10);
  const index = new ElementSpatialIndex();
  index.sync(movedLeft);
  let flip = false;

  bench(
    "sync a new map in which one element moved",
    () => {
      flip = !flip;
      index.sync(flip ? movedRight : movedLeft);
    },
    BENCH_OPTIONS,
  );

  bench(
    "sync the same map, nothing changed (version check only)",
    () => {
      syncedIndex.sync(elementsMap);
    },
    BENCH_OPTIONS,
  );

  bench(
    "build from scratch",
    () => {
      new ElementSpatialIndex().sync(elementsMap);
    },
    BENCH_OPTIONS,
  );
});
