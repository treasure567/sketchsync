import type { MaybePromise } from "@sketchsync/common/utility-types";

import type { SketchSyncElement } from "@sketchsync/element/types";

import { getFileHandleType, isImageFileHandleType } from "./blob";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { exportCanvas, prepareElementsForExport } from ".";

import type { AppState, BinaryFiles } from "../types";

export const resaveAsImageWithScene = async (
  data: MaybePromise<{
    elements: readonly SketchSyncElement[];
    appState: AppState;
    files: BinaryFiles;
  }>,
  fileHandle: FileSystemFileHandle,
  filename: string,
) => {
  const fileHandleType = getFileHandleType(fileHandle);

  if (!isImageFileHandleType(fileHandleType)) {
    throw new Error(
      "fileHandle should exist and should be of type svg or png when resaving",
    );
  }

  let { elements, appState, files } = await data;

  appState = {
    ...appState,
    exportEmbedScene: true,
  };

  const { exportedElements, exportingFrame } = prepareElementsForExport(
    elements,
    appState,
    false,
  );

  await exportCanvas(fileHandleType, exportedElements, appState, files, {
    name: filename,
    fileHandle,
    exportingFrame,
  });

  return { fileHandle };
};
