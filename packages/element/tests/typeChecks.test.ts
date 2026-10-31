import { API } from "@sketchsync/editor/tests/helpers/api";

import { newElementWith } from "../src/mutateElement";
import {
  hasBoundTextElement,
  isLinearElement,
  isTextElement,
} from "../src/typeChecks";

import type {
  SketchSyncElement,
  SketchSyncLinearElement,
  SketchSyncTextElement,
  NonDeleted,
  NonDeletedSketchSyncElement,
} from "../src/types";

describe("Test TypeChecks", () => {
  describe("Test hasBoundTextElement", () => {
    it("should return true for text bindable containers with bound text", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "rectangle",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();

      expect(
        hasBoundTextElement(
          API.createElement({
            type: "ellipse",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();

      expect(
        hasBoundTextElement(
          API.createElement({
            type: "arrow",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeTruthy();
    });

    it("should return false for text bindable containers without bound text", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "freedraw",
            boundElements: [{ type: "arrow", id: "arrow-id" }],
          }),
        ),
      ).toBeFalsy();
    });

    it("should return false for non text bindable containers", () => {
      expect(
        hasBoundTextElement(
          API.createElement({
            type: "freedraw",
            boundElements: [{ type: "text", id: "text-id" }],
          }),
        ),
      ).toBeFalsy();
    });

    expect(
      hasBoundTextElement(
        API.createElement({
          type: "image",
          boundElements: [{ type: "text", id: "text-id" }],
        }),
      ),
    ).toBeFalsy();
  });
});

describe("Test NonDeleted type", () => {
  it("should only allow `isDeleted: false` elements", () => {
    const element = API.createElement({ type: "rectangle" });
    const deletedElement = newElementWith(element as SketchSyncElement, {
      isDeleted: true,
    });

    // @ts-expect-error deleted elements are not assignable to NonDeleted
    const nonDeleted: NonDeletedSketchSyncElement = deletedElement;

    // runtime narrowing is still required to treat an element as non-deleted
    // @ts-expect-error generic elements are not assignable to NonDeleted
    const nonDeletedGeneric: NonDeletedSketchSyncElement =
      deletedElement as SketchSyncElement;

    expect(nonDeleted.isDeleted).toBe(true);
    expect(nonDeletedGeneric.isDeleted).toBe(true);
  });

  it("should be preserved by type guards", () => {
    const elements: NonDeletedSketchSyncElement[] = [
      API.createElement({ type: "text", text: "text" }),
      API.createElement({ type: "arrow" }),
    ];

    const textElements: NonDeleted<SketchSyncTextElement>[] =
      elements.filter(isTextElement);
    const linearElements: NonDeleted<SketchSyncLinearElement>[] =
      elements.filter(isLinearElement);

    expect(textElements.length).toBe(1);
    expect(linearElements.length).toBe(1);
  });
});
