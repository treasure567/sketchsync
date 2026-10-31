import { MIME_TYPES } from "@sketchsync/common";
import { decompressData } from "@sketchsync/editor/data/encode";

import type { FileId } from "@sketchsync/element/types";
import type {
  BinaryFileData,
  BinaryFileMetadata,
  DataURL,
} from "@sketchsync/editor/types";

import { boardRequestHeaders } from "./sketchsyncApi";

const STORAGE_URL = (import.meta.env.VITE_APP_STORAGE_URL || "/api").replace(
  /\/$/,
  "",
);

// Callers pass storage paths like `/files/rooms/<boardId>`.
const fileUrl = (prefix: string, id: FileId) =>
  `${STORAGE_URL}/files/${prefix.replace(/^\/?(files\/)?/, "")}/${id}`;

export const saveBoardFiles = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const erroredFiles: FileId[] = [];
  const savedFiles: FileId[] = [];

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const response = await fetch(fileUrl(prefix, id), {
          method: "PUT",
          credentials: "include",
          headers: boardRequestHeaders(),
          body: buffer as Uint8Array<ArrayBuffer>,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        savedFiles.push(id);
      } catch (error: any) {
        erroredFiles.push(id);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadBoardFiles = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const response = await fetch(fileUrl(prefix, id), {
          credentials: "include",
          headers: boardRequestHeaders(),
        });
        if (response.status < 400) {
          const arrayBuffer = await response.arrayBuffer();

          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(arrayBuffer),
            {
              decryptionKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
            lastRetrieved: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};
