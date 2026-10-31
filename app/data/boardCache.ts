import { createStore, get, getMany, set, setMany } from "idb-keyval";

import type {
  FileId,
  OrderedSketchSyncElement,
} from "@sketchsync/element/types";
import type { BinaryFileData } from "@sketchsync/editor/types";

import type { BoardInfo } from "./sketchsyncApi";

type CachedBoard = {
  board: BoardInfo;
  elements: readonly OrderedSketchSyncElement[];
  savedAt: number;
};

// Kept apart from SketchSync's own `files-db`, which prunes images that aren't
// on the local scratch canvas.
const scenesStore = createStore("sketchsync-boards", "scenes");
const filesStore = createStore("sketchsync-board-files", "files");

const fileKey = (boardId: string, fileId: FileId) => `${boardId}/${fileId}`;

const ignoreStorageErrors = (error: unknown) => {
  console.warn("board cache unavailable:", error);
};

export const boardCache = {
  load: (boardId: string) =>
    get<CachedBoard>(boardId, scenesStore).catch((error) => {
      ignoreStorageErrors(error);
      return undefined;
    }),

  save: (board: BoardInfo, elements: readonly OrderedSketchSyncElement[]) => {
    const entry: CachedBoard = { board, elements, savedAt: Date.now() };
    return set(board.id, entry, scenesStore).catch(ignoreStorageErrors);
  },

  loadFiles: async (boardId: string, fileIds: readonly FileId[]) => {
    try {
      const found = await getMany<BinaryFileData | undefined>(
        fileIds.map((id) => fileKey(boardId, id)),
        filesStore,
      );
      return found.filter((file): file is BinaryFileData => !!file);
    } catch (error) {
      ignoreStorageErrors(error);
      return [];
    }
  },

  saveFiles: (boardId: string, files: readonly BinaryFileData[]) =>
    setMany(
      files.map((file) => [fileKey(boardId, file.id), file]),
      filesStore,
    ).catch(ignoreStorageErrors),
};
