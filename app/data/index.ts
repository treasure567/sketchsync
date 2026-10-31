import { compressData, decompressData } from "@sketchsync/editor/data/encode";
import {
  decryptData,
  generateEncryptionKey,
  IV_LENGTH_BYTES,
} from "@sketchsync/editor/data/encryption";
import { serializeAsJSON } from "@sketchsync/editor/data/json";
import { isInvisiblySmallElement } from "@sketchsync/element";
import { isInitializedImageElement } from "@sketchsync/element";
import { t } from "@sketchsync/editor/i18n";

import type { UserIdleState } from "@sketchsync/common";
import type { ImportedDataState } from "@sketchsync/editor/data/types";
import type { SceneBounds } from "@sketchsync/element";
import type {
  SketchSyncElement,
  FileId,
  OrderedSketchSyncElement,
} from "@sketchsync/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  SocketId,
} from "@sketchsync/editor/types";
import type { MakeBrand } from "@sketchsync/common/utility-types";

import {
  DELETED_ELEMENT_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
} from "../app_constants";

import { encodeFilesForUpload } from "./FileManager";
import { saveBoardFiles } from "./fileStorage";

import type { WS_SUBTYPES } from "../app_constants";

export type SyncableSketchSyncElement = OrderedSketchSyncElement &
  MakeBrand<"SyncableSketchSyncElement">;

export const isSyncableElement = (
  element: OrderedSketchSyncElement,
): element is SyncableSketchSyncElement => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true;
    }
    return false;
  }
  return !isInvisiblySmallElement(element);
};

export const getSyncableElements = (
  elements: readonly OrderedSketchSyncElement[],
) =>
  elements.filter((element) =>
    isSyncableElement(element),
  ) as SyncableSketchSyncElement[];

const BACKEND_V2_GET = import.meta.env.VITE_APP_BACKEND_V2_GET_URL;
const BACKEND_V2_POST = import.meta.env.VITE_APP_BACKEND_V2_POST_URL;

export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: WS_SUBTYPES.INVALID_RESPONSE;
  };
  SCENE_INIT: {
    type: WS_SUBTYPES.INIT;
    payload: {
      elements: readonly OrderedSketchSyncElement[];
    };
  };
  SCENE_UPDATE: {
    type: WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly OrderedSketchSyncElement[];
    };
  };
  MOUSE_LOCATION: {
    type: WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
  IDLE_STATUS: {
    type: WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming =
  SocketUpdateDataSource[keyof SocketUpdateDataSource];

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };

const LINK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export type BoardLinkData = { roomId: string; inviteToken: string | null };

export const getCollaborationLinkData = (
  link: string,
): BoardLinkData | null => {
  const { hash } = new URL(link);
  if (!hash.startsWith("#board=")) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const roomId = params.get("board");
  const inviteToken = params.get("invite");
  if (
    !roomId ||
    !LINK_ID_PATTERN.test(roomId) ||
    (inviteToken !== null && !LINK_ID_PATTERN.test(inviteToken))
  ) {
    return null;
  }
  return { roomId, inviteToken };
};

export const isCollaborationLink = (link: string) =>
  getCollaborationLinkData(link) !== null;

export const getCollaborationLink = ({
  roomId,
  inviteToken = null,
}: {
  roomId: string;
  inviteToken?: string | null;
}) =>
  `${window.location.origin}${window.location.pathname}#board=${roomId}${
    inviteToken ? `&invite=${inviteToken}` : ""
  }`;

/**
 * Decodes shareLink data using the legacy buffer format.
 * @deprecated
 */
const legacy_decodeFromBackend = async ({
  buffer,
  decryptionKey,
}: {
  buffer: ArrayBuffer;
  decryptionKey: string;
}) => {
  let decrypted: ArrayBuffer;

  try {
    // Buffer should contain both the IV (fixed length) and encrypted data
    const iv = buffer.slice(0, IV_LENGTH_BYTES);
    const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);
    decrypted = await decryptData(new Uint8Array(iv), encrypted, decryptionKey);
  } catch (error: any) {
    // Fixed IV (old format, backward compatibility)
    const fixedIv = new Uint8Array(IV_LENGTH_BYTES);
    decrypted = await decryptData(fixedIv, buffer, decryptionKey);
  }

  // We need to convert the decrypted array buffer to a string
  const string = new window.TextDecoder("utf-8").decode(
    new Uint8Array(decrypted),
  );
  const data: ImportedDataState = JSON.parse(string);

  return {
    elements: data.elements || null,
    appState: data.appState || null,
  };
};

export const importFromBackend = async (
  id: string,
  decryptionKey: string,
): Promise<ImportedDataState> => {
  try {
    const response = await fetch(`${BACKEND_V2_GET}${id}`);

    if (!response.ok) {
      window.alert(t("alerts.importBackendFailed"));
      return {};
    }
    const buffer = await response.arrayBuffer();

    try {
      const { data: decodedBuffer } = await decompressData(
        new Uint8Array(buffer),
        {
          decryptionKey,
        },
      );
      const data: ImportedDataState = JSON.parse(
        new TextDecoder().decode(decodedBuffer),
      );

      return {
        elements: data.elements || null,
        appState: data.appState || null,
      };
    } catch (error: any) {
      console.warn(
        "error when decoding shareLink data using the new format:",
        error,
      );
      return legacy_decodeFromBackend({ buffer, decryptionKey });
    }
  } catch (error: any) {
    window.alert(t("alerts.importBackendFailed"));
    console.error(error);
    return {};
  }
};

type ExportToBackendResult =
  | { url: null; errorMessage: string }
  | { url: string; errorMessage: null };

export const exportToBackend = async (
  elements: readonly SketchSyncElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): Promise<ExportToBackendResult> => {
  const encryptionKey = await generateEncryptionKey("string");

  const payload = await compressData(
    new TextEncoder().encode(
      serializeAsJSON(elements, appState, files, "database"),
    ),
    { encryptionKey },
  );

  try {
    const filesMap = new Map<FileId, BinaryFileData>();
    for (const element of elements) {
      if (isInitializedImageElement(element) && files[element.fileId]) {
        filesMap.set(element.fileId, files[element.fileId]);
      }
    }

    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    const response = await fetch(BACKEND_V2_POST, {
      method: "POST",
      body: payload.buffer,
    });
    const json = await response.json();
    if (json.id) {
      const url = new URL(window.location.href);
      // We need to store the key (and less importantly the id) as hash instead
      // of queryParam in order to never send it to the server
      url.hash = `json=${json.id},${encryptionKey}`;
      const urlString = url.toString();

      await saveBoardFiles({
        prefix: `/files/shareLinks/${json.id}`,
        files: filesToUpload,
      });

      return { url: urlString, errorMessage: null };
    } else if (json.error_class === "RequestTooLargeError") {
      return {
        url: null,
        errorMessage: t("alerts.couldNotCreateShareableLinkTooBig"),
      };
    }

    return { url: null, errorMessage: t("alerts.couldNotCreateShareableLink") };
  } catch (error: any) {
    console.error(error);

    return { url: null, errorMessage: t("alerts.couldNotCreateShareableLink") };
  }
};
