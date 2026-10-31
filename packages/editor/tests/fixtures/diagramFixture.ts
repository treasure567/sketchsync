import { VERSIONS } from "@sketchsync/common";

import type {
  SketchSyncElement,
  NonDeletedSketchSyncElement,
} from "@sketchsync/element/types";

import {
  diamondFixture,
  ellipseFixture,
  rectangleFixture,
} from "./elementFixture";

export const diagramFixture = {
  type: "sketchsync",
  version: VERSIONS.sketchsync,
  source: "https://example.com",
  elements: [diamondFixture, ellipseFixture, rectangleFixture],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridModeEnabled: false,
  },
  files: {},
};

export const diagramFactory = ({
  overrides = {},
  elementOverrides = {} as Partial<SketchSyncElement>,
} = {}) => ({
  ...diagramFixture,
  elements: [
    {
      ...diamondFixture,
      ...elementOverrides,
      isDeleted: elementOverrides.isDeleted ?? false,
    } as NonDeletedSketchSyncElement,
    {
      ...ellipseFixture,
      ...elementOverrides,
      isDeleted: elementOverrides.isDeleted ?? false,
    } as NonDeletedSketchSyncElement,
    {
      ...rectangleFixture,
      ...elementOverrides,
      isDeleted: elementOverrides.isDeleted ?? false,
    } as NonDeletedSketchSyncElement,
  ],
  ...overrides,
});

export default diagramFixture;
