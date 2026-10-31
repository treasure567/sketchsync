import { useState } from "react";

import { SketchSync } from "@sketchsync/editor";
import { API } from "@sketchsync/editor/tests/helpers/api";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@sketchsync/editor/tests/test-utils";

import type {
  SketchSyncImperativeAPI,
  NormalizedZoomValue,
} from "@sketchsync/editor/types";

import {
  Minimap,
  getMinimapMapping,
  getScrollAfterKeyboardStep,
  getScrollToShowAt,
  minimapToScene,
} from "../components/Minimap";

const { h } = window;

const viewport = {
  scrollX: -100,
  scrollY: -50,
  zoom: { value: 2 as NormalizedZoomValue },
  width: 800,
  height: 600,
};

describe("minimap geometry", () => {
  it("fits the scene into the minimap, centred, with an inset", () => {
    const mapping = getMinimapMapping([0, 0, 1000, 500], 200, 140, 10);

    expect(mapping.scale).toBeCloseTo(0.18);
    expect(minimapToScene(mapping, 100, 70)).toEqual({ x: 500, y: 250 });
    expect(minimapToScene(mapping, 10, 25).x).toBeCloseTo(0);
  });

  it("centres the view on a clicked scene point", () => {
    const scroll = getScrollToShowAt(viewport, 1000, 400);
    const centreX = -scroll.scrollX + viewport.width / viewport.zoom.value / 2;
    const centreY = -scroll.scrollY + viewport.height / viewport.zoom.value / 2;

    expect({ centreX, centreY }).toEqual({ centreX: 1000, centreY: 400 });
  });

  it("keeps the grabbed point under the pointer while dragging", () => {
    const scroll = getScrollToShowAt(viewport, 1000, 400, { x: 30, y: 20 });

    expect(-scroll.scrollX + 30).toBe(1000);
    expect(-scroll.scrollY + 20).toBe(400);
  });

  it("moves a quarter of the visible area per arrow key", () => {
    expect(getScrollAfterKeyboardStep(viewport, { x: 1, y: 0 }, 0.25)).toEqual({
      scrollX: -200,
      scrollY: -50,
    });
    expect(getScrollAfterKeyboardStep(viewport, { x: 0, y: -1 }, 1)).toEqual({
      scrollX: -100,
      scrollY: 250,
    });
  });
});

describe("minimap keyboard focus", () => {
  const EditorWithMinimap = () => {
    const [sketchsyncAPI, setSketchSyncAPI] =
      useState<SketchSyncImperativeAPI | null>(null);
    return (
      <SketchSync
        onSketchSyncAPI={setSketchSyncAPI}
        handleKeyboardGlobally={true}
        UIOptions={{ getFormFactor: () => "desktop" }}
      >
        {sketchsyncAPI && <Minimap sketchsyncAPI={sketchsyncAPI} />}
      </SketchSync>
    );
  };

  beforeEach(async () => {
    localStorage.clear();
    await render(<EditorWithMinimap />);
  });

  const selectRectangle = async () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);
    const minimap = await waitFor(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".sketchsync-minimap__canvas",
      );
      expect(canvas).not.toBeNull();
      return canvas!;
    });
    act(() => minimap.focus());
    return { rectangle, minimap };
  };

  it("keeps Enter, Space, Delete and arrows away from the selection", async () => {
    const { rectangle, minimap } = await selectRectangle();
    act(() => h.setState({ width: 1000, height: 800 }));
    const scrollXBefore = h.state.scrollX;

    for (const key of ["Enter", " ", "Delete", "Backspace", "ArrowRight"]) {
      fireEvent.keyDown(minimap, { key });
    }

    expect(h.state.editingTextElement).toBeNull();
    expect(h.elements.filter((element) => !element.isDeleted)).toEqual([
      expect.objectContaining({ id: rectangle.id, x: 0, y: 0 }),
    ]);
    expect(h.state.scrollX).toBe(
      scrollXBefore - (1000 / h.state.zoom.value) * 0.25,
    );
  });

  it("leaves those keys to the editor when the minimap isn't focused", async () => {
    await selectRectangle();

    fireEvent.keyDown(document, { key: "Enter" });

    expect(h.state.editingTextElement).not.toBeNull();
  });
});
