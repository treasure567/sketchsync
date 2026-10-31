import type { SketchSyncTextContainer } from "./types";

export const originalContainerCache: {
  [id: SketchSyncTextContainer["id"]]:
    | {
        height: SketchSyncTextContainer["height"];
      }
    | undefined;
} = {};

export const updateOriginalContainerCache = (
  id: SketchSyncTextContainer["id"],
  height: SketchSyncTextContainer["height"],
) => {
  const data =
    originalContainerCache[id] || (originalContainerCache[id] = { height });
  data.height = height;
  return data;
};

export const resetOriginalContainerCache = (
  id: SketchSyncTextContainer["id"],
) => {
  if (originalContainerCache[id]) {
    delete originalContainerCache[id];
  }
};

export const getOriginalContainerHeightFromCache = (
  id: SketchSyncTextContainer["id"],
) => {
  return originalContainerCache[id]?.height ?? null;
};
