import React from "react";

import type { SketchSyncFreeDrawElement } from "@sketchsync/element/types";

import { SketchSync } from "../index";

import { API } from "./helpers/api";
import { Pointer, UI } from "./helpers/ui";
import { render } from "./test-utils";

const { h } = window;

const getStrokes = () =>
  h.elements.filter(
    (element): element is SketchSyncFreeDrawElement =>
      element.type === "freedraw" && !element.isDeleted,
  );

const getStrokeXs = (stroke: SketchSyncFreeDrawElement) =>
  stroke.points.map(([x]) => stroke.x + x);

describe("pen mode palm rejection", () => {
  beforeEach(async () => {
    await render(<SketchSync handleKeyboardGlobally={true} />);
  });

  afterEach(() => {
    Pointer.activePointers = [];
  });

  it("turns pen mode on at the first pen input on the canvas", () => {
    expect(h.state.penMode).toBe(false);
    UI.clickTool("freedraw");

    const pen = new Pointer("pen", 1);
    pen.downAt(100, 100);
    pen.moveTo(150, 150);
    pen.upAt();

    expect(h.state.penDetected).toBe(true);
    expect(h.state.penMode).toBe(true);
  });

  it("keeps a single touch from drawing in pen mode", () => {
    API.setAppState({ penMode: true, penDetected: true });
    UI.clickTool("freedraw");

    const finger = new Pointer("touch", 2);
    finger.downAt(100, 100);
    finger.moveTo(200, 200);
    finger.upAt();

    expect(getStrokes()).toHaveLength(0);
  });

  it("ignores a palm that touches down while the pen is drawing", () => {
    API.setAppState({ penMode: true, penDetected: true });
    UI.clickTool("freedraw");

    const pen = new Pointer("pen", 1);
    const palm = new Pointer("touch", 2);
    pen.downAt(100, 100);
    pen.moveTo(120, 120);
    palm.downAt(400, 400);
    palm.moveTo(420, 430);
    pen.moveTo(140, 140);
    palm.upAt();
    pen.moveTo(160, 160);
    pen.upAt();

    const strokes = getStrokes();
    expect(strokes).toHaveLength(1);
    const xs = getStrokeXs(strokes[0]);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(155);
    expect(Math.max(...xs)).toBeLessThan(200);
    expect(h.state.zoom.value).toBe(1);
  });
});
