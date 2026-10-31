import { isElementInViewport, Scene } from "@sketchsync/element";

import type { NonDeletedSketchSyncElement } from "@sketchsync/element/types";

import {
  createMixedScene,
  createRandom,
} from "../../../element/tests/helpers/mixedScene";
import { getDefaultAppState } from "../../appState";
import { Renderer } from "../../scene/Renderer";
import { API } from "../helpers/api";

import type { RenderableElementsMap } from "../../scene/types";
import type { AppState, NormalizedZoomValue } from "../../types";

type Viewport = Pick<
  AppState,
  | "zoom"
  | "offsetLeft"
  | "offsetTop"
  | "scrollX"
  | "scrollY"
  | "width"
  | "height"
>;

const linearFilter = (elementsMap: RenderableElementsMap, view: Viewport) =>
  [...elementsMap.values()].filter((element) =>
    isElementInViewport(element, view.width, view.height, view, elementsMap),
  );

const ids = (elements: readonly NonDeletedSketchSyncElement[]) =>
  elements.map((element) => element.id);

const setup = (elements: NonDeletedSketchSyncElement[]) => {
  const scene = new Scene(elements, { skipValidation: true });
  const renderer = new Renderer(scene);
  const appState: AppState = {
    ...getDefaultAppState(),
    width: 1200,
    height: 800,
    offsetLeft: 0,
    offsetTop: 0,
    scrollX: 0,
    scrollY: 0,
  };
  const render = (overrides: Partial<AppState> = {}) =>
    renderer.getRenderableElements({
      ...appState,
      ...overrides,
      selectedElements: [],
    });
  return { scene, renderer, appState, render };
};

describe("Renderer visible elements", () => {
  it("draws the same elements in the same order as the linear viewport filter", () => {
    const { render } = setup(createMixedScene({ count: 3000, seed: 21 }));
    const random = createRandom(4);

    for (let frame = 0; frame < 50; frame++) {
      const view = {
        zoom: {
          value: (random() < 0.2
            ? 0.1
            : 0.3 + random() * 2) as NormalizedZoomValue,
        },
        scrollX: (random() - 0.5) * 20_000,
        scrollY: (random() - 0.5) * 20_000,
        offsetLeft: 0,
        offsetTop: 0,
        width: 1200,
        height: 800,
      };
      const { elementsMap, visibleElements } = render(view);
      expect(ids(visibleElements)).toEqual(
        ids(linearFilter(elementsMap, view)),
      );
    }
  });

  it("leaves out the text being edited and a new element drawn on its own canvas", () => {
    const rectangle = API.createElement({ id: "rect", x: 10, y: 10 });
    const text = API.createElement({ type: "text", id: "text", x: 50, y: 50 });
    const drawing = API.createElement({ id: "drawing", x: 80, y: 80 });
    const { render } = setup([rectangle, text, drawing]);

    expect(ids(render().visibleElements)).toEqual(["rect", "text", "drawing"]);
    const { visibleElements, newElementCanvasElement } = render({
      editingTextElement: text,
      newElement: drawing as AppState["newElement"],
    });
    expect(ids(visibleElements)).toEqual(["rect"]);
    expect(newElementCanvasElement).toBe(drawing);
  });

  it("reuses the elements map while panning and renews it when the scene changes", () => {
    const rectangle = API.createElement({ id: "rect", x: 10, y: 10 });
    const { scene, render } = setup([rectangle]);

    const first = render();
    const panned = render({ scrollX: -50 });
    expect(panned.elementsMap).toBe(first.elementsMap);
    expect(panned.visibleElements).not.toBe(first.visibleElements);

    scene.mutateElement(rectangle, { x: 20 });
    expect(render({ scrollX: -50 }).elementsMap).not.toBe(first.elementsMap);
  });

  it("follows elements mutated without informing the scene on the next pan", () => {
    const rectangle = API.createElement({ id: "rect", x: 10, y: 10 });
    const { scene, render } = setup([rectangle]);
    expect(ids(render().visibleElements)).toEqual(["rect"]);

    scene.mutateElement(
      rectangle,
      { x: 5000 },
      { informMutation: false, isDragging: false },
    );

    expect(render({ scrollX: -1 }).visibleElements).toEqual([]);
    expect(ids(render({ scrollX: -4900 }).visibleElements)).toEqual(["rect"]);
  });

  it("updates the visible set when elements are moved, added and deleted", () => {
    const a = API.createElement({ id: "a", x: 10, y: 10 });
    const b = API.createElement({ id: "b", x: 300, y: 10 });
    const { scene, render } = setup([a, b]);
    expect(ids(render().visibleElements)).toEqual(["a", "b"]);

    scene.mutateElement(a, { x: 9000 });
    expect(ids(render().visibleElements)).toEqual(["b"]);

    const c = API.createElement({ id: "c", x: 400, y: 10 });
    scene.insertElement(c);
    expect(ids(render().visibleElements)).toEqual(["b", "c"]);

    scene.replaceAllElements(
      scene
        .getElementsIncludingDeleted()
        .map((element) =>
          element.id === "b" ? { ...element, isDeleted: true } : element,
        ),
    );
    expect(ids(render().visibleElements)).toEqual(["c"]);
  });
});
