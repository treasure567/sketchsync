import {
  CaptureUpdateAction,
  getSceneVersion,
  restoreElements,
  zoomToFitBounds,
  reconcileElements,
} from "@sketchsync/editor";
import { ErrorDialog } from "@sketchsync/editor/components/ErrorDialog";
import { APP_NAME, EVENT, toBrandedType } from "@sketchsync/common";
import {
  IDLE_THRESHOLD,
  ACTIVE_THRESHOLD,
  UserIdleState,
  assertNever,
  debounce,
  isDevEnv,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  throttleRAF,
} from "@sketchsync/common";
import { getVisibleSceneBounds } from "@sketchsync/element";
import { newElementWith } from "@sketchsync/element";
import { isImageElement, isInitializedImageElement } from "@sketchsync/element";
import { AbortError } from "@sketchsync/editor/errors";
import { t } from "@sketchsync/editor/i18n";
import { withBatchedUpdates } from "@sketchsync/editor/reactUtils";

import throttle from "lodash.throttle";
import { PureComponent } from "react";

import { bumpElementVersions } from "@sketchsync/editor/data/restore";

import type {
  ReconciledSketchSyncElement,
  RemoteSketchSyncElement,
} from "@sketchsync/editor/data/reconcile";
import type { ImportedDataState } from "@sketchsync/editor/data/types";
import type {
  SketchSyncElement,
  FileId,
  InitializedSketchSyncImageElement,
  OrderedSketchSyncElement,
} from "@sketchsync/element/types";
import type {
  BinaryFileData,
  SketchSyncImperativeAPI,
  SocketId,
  Collaborator,
  Gesture,
  UserToFollow,
} from "@sketchsync/editor/types";
import type { Mutable, ValueOf } from "@sketchsync/common/utility-types";

import { appJotaiStore, atom } from "../app-jotai";
import {
  BOARD_CACHE_SAVE_TIMEOUT,
  SCENE_BROADCAST_BATCH_MS,
  CURSOR_SYNC_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
  STORAGE_PREFIXES,
  INITIAL_SCENE_UPDATE_TIMEOUT,
  LOAD_IMAGES_TIMEOUT,
  WS_SUBTYPES,
  SYNC_FULL_SCENE_INTERVAL_MS,
  WS_EVENTS,
} from "../app_constants";
import { getCollaborationLink, getSyncableElements } from "../data";
import {
  encodeFilesForUpload,
  FileManager,
  updateStaleImageStatuses,
} from "../data/FileManager";
import { FileStatusStore } from "../data/fileStatusStore";
import { LocalData } from "../data/LocalData";
import { getRandomUsername } from "../data/randomUsername";
import { boardCache } from "../data/boardCache";
import { loadBoardFiles, saveBoardFiles } from "../data/fileStorage";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
  saveUsernameToLocalStorage,
} from "../data/localStorage";
import {
  api,
  ApiError,
  currentBoardAtom,
  currentUserAtom,
  describeError,
  getBoardInvite,
  isNetworkError,
  setBoardInvite,
} from "../data/sketchsyncApi";
import { accountDialogAtom } from "../components/AccountDialog";
import { resetBrowserStateVersions } from "../data/tabSync";

import { collabErrorIndicatorAtom } from "./CollabError";
import Portal from "./Portal";

import type { BoardLinkData, SocketUpdateDataSource } from "../data";
import type { BoardInfo } from "../data/sketchsyncApi";

export const collabAPIAtom = atom<CollabAPI | null>(null);
export const isCollaboratingAtom = atom(false);
export const isOfflineAtom = atom(
  typeof navigator !== "undefined" && !navigator.onLine,
);

const OFFLINE_STATUS_DEBOUNCE_TIMEOUT = 1000;

interface CollabState {
  errorMessage: string | null;
  /** errors related to saving */
  dialogNotifiedErrors: Record<string, boolean>;
  username: string;
  activeRoomLink: string | null;
}

export const activeRoomLinkAtom = atom<string | null>(null);
export const userToFollowAtom = atom<UserToFollow | null>(null);

type CollabInstance = InstanceType<typeof Collab>;

export interface CollabAPI {
  /** function so that we can access the latest value from stale callbacks */
  isCollaborating: () => boolean;
  onPointerUpdate: CollabInstance["onPointerUpdate"];
  startCollaboration: CollabInstance["startCollaboration"];
  stopCollaboration: CollabInstance["stopCollaboration"];
  syncElements: CollabInstance["syncElements"];
  fetchBoardImageFiles: CollabInstance["fetchBoardImageFiles"];
  setUsername: CollabInstance["setUsername"];
  getUsername: CollabInstance["getUsername"];
  getActiveRoomLink: CollabInstance["getActiveRoomLink"];
  setCollabError: CollabInstance["setErrorDialog"];
  setUserToFollow: CollabInstance["setUserToFollow"];
}

interface CollabProps {
  sketchsyncAPI: SketchSyncImperativeAPI;
}

class Collab extends PureComponent<CollabProps, CollabState> {
  portal: Portal;
  fileManager: FileManager;
  sketchsyncAPI: CollabProps["sketchsyncAPI"];
  activeIntervalId: number | null;
  idleTimeoutId: number | null;

  private socketInitializationTimer?: number;
  private lastBroadcastedOrReceivedSceneVersion: number = -1;
  private collaborators = new Map<SocketId, Collaborator>();
  /** the socket ids of the users following the current user */
  private followedBy = new Set<SocketId>();

  constructor(props: CollabProps) {
    super(props);
    this.state = {
      errorMessage: null,
      dialogNotifiedErrors: {},
      username: importUsernameFromLocalStorage() || "",
      activeRoomLink: null,
    };
    this.portal = new Portal(this);
    this.fileManager = new FileManager({
      onFileStatusChange: FileStatusStore.updateStatuses.bind(FileStatusStore),
      getFiles: async (fileIds) => {
        const { roomId, roomKey } = this.portal;
        if (!roomId || !roomKey) {
          throw new AbortError();
        }

        const result = await loadBoardFiles(
          `files/rooms/${roomId}`,
          roomKey,
          fileIds,
        );
        boardCache.saveFiles(roomId, result.loadedFiles);
        if (result.erroredFiles.size) {
          const cachedFiles = await boardCache.loadFiles(roomId, [
            ...result.erroredFiles.keys(),
          ]);
          for (const file of cachedFiles) {
            result.erroredFiles.delete(file.id);
            result.loadedFiles.push(file);
          }
        }
        return result;
      },
      saveFiles: async ({ addedFiles }) => {
        const { roomId, roomKey } = this.portal;
        if (!roomId || !roomKey) {
          throw new AbortError();
        }
        boardCache.saveFiles(roomId, [...addedFiles.values()]);

        const { savedFiles, erroredFiles } = await saveBoardFiles({
          prefix: `${STORAGE_PREFIXES.collabFiles}/${roomId}`,
          files: await encodeFilesForUpload({
            files: addedFiles,
            encryptionKey: roomKey,
            maxBytes: FILE_UPLOAD_MAX_BYTES,
          }),
        });

        return {
          savedFiles: savedFiles.reduce(
            (acc: Map<FileId, BinaryFileData>, id) => {
              const fileData = addedFiles.get(id);
              if (fileData) {
                acc.set(id, fileData);
              }
              return acc;
            },
            new Map(),
          ),
          erroredFiles: erroredFiles.reduce(
            (acc: Map<FileId, BinaryFileData>, id) => {
              const fileData = addedFiles.get(id);
              if (fileData) {
                acc.set(id, fileData);
              }
              return acc;
            },
            new Map(),
          ),
        };
      },
    });
    this.sketchsyncAPI = props.sketchsyncAPI;
    this.activeIntervalId = null;
    this.idleTimeoutId = null;
  }

  private onUmmount: (() => void) | null = null;

  componentDidMount() {
    window.addEventListener(EVENT.BEFORE_UNLOAD, this.beforeUnload);
    window.addEventListener("online", this.onOfflineStatusChange);
    window.addEventListener("offline", this.onOfflineStatusChange);
    window.addEventListener(EVENT.UNLOAD, this.onUnload);

    const unsubOnUserFollow = this.sketchsyncAPI.onUserFollow((payload) => {
      this.setUserToFollow(
        payload.action === "FOLLOW" ? payload.userToFollow : null,
      );
    });
    const throttledRelayUserViewportBounds = throttleRAF(
      this.relayVisibleSceneBounds,
    );
    const unsubOnScrollChange = this.sketchsyncAPI.onScrollChange(() =>
      throttledRelayUserViewportBounds(),
    );
    this.onUmmount = () => {
      unsubOnUserFollow();
      unsubOnScrollChange();
    };

    this.onOfflineStatusToggle();

    const collabAPI: CollabAPI = {
      isCollaborating: this.isCollaborating,
      onPointerUpdate: this.onPointerUpdate,
      startCollaboration: this.startCollaboration,
      syncElements: this.syncElements,
      fetchBoardImageFiles: this.fetchBoardImageFiles,
      stopCollaboration: this.stopCollaboration,
      setUsername: this.setUsername,
      getUsername: this.getUsername,
      getActiveRoomLink: this.getActiveRoomLink,
      setCollabError: this.setErrorDialog,
      setUserToFollow: this.setUserToFollow,
    };

    appJotaiStore.set(collabAPIAtom, collabAPI);

    if (isTestEnv() || isDevEnv()) {
      window.collab = window.collab || ({} as Window["collab"]);
      Object.defineProperties(window, {
        collab: {
          configurable: true,
          value: this,
        },
      });
    }
  }

  onOfflineStatusToggle = () => {
    appJotaiStore.set(isOfflineAtom, !window.navigator.onLine);
  };

  onOfflineStatusChange = debounce(
    this.onOfflineStatusToggle,
    OFFLINE_STATUS_DEBOUNCE_TIMEOUT,
  );

  componentWillUnmount() {
    window.removeEventListener("online", this.onOfflineStatusChange);
    window.removeEventListener("offline", this.onOfflineStatusChange);
    this.onOfflineStatusChange.cancel();
    window.removeEventListener(EVENT.BEFORE_UNLOAD, this.beforeUnload);
    window.removeEventListener(EVENT.UNLOAD, this.onUnload);
    window.removeEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
    window.removeEventListener(
      EVENT.VISIBILITY_CHANGE,
      this.onVisibilityChange,
    );
    if (this.activeIntervalId) {
      window.clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
    if (this.idleTimeoutId) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    this.onUmmount?.();
  }

  isCollaborating = () => appJotaiStore.get(isCollaboratingAtom)!;

  private setIsCollaborating = (isCollaborating: boolean) => {
    appJotaiStore.set(isCollaboratingAtom, isCollaborating);
  };

  private onUnload = () => {
    this.destroySocketClient({ isUnload: true });
  };

  private beforeUnload = withBatchedUpdates((event: BeforeUnloadEvent) => {
    const syncableElements = getSyncableElements(
      this.getSceneElementsIncludingDeleted(),
    );

    if (!this.isCollaborating()) {
      return;
    }
    this.persistBoardLocally();
    this.persistBoardLocally.flush();

    // Unsent edits are safe in the board cache and sync next time the board
    // opens, so only hold the user back while a sync could still finish now.
    if (
      this.portal.socket?.connected &&
      (this.fileManager.shouldPreventUnload(syncableElements) ||
        !this.portal.isSynced(syncableElements))
    ) {
      this.queueBroadcastAllElements();
      this.queueBroadcastAllElements.flush();

      if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
        preventUnload(event);
      } else {
        console.warn(
          "preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)",
        );
      }
    }
  });

  stopCollaboration = (restoreLocalCanvas = true) => {
    this.persistBoardLocally();
    this.persistBoardLocally.flush();
    this.queueBroadcastChanges.flush();
    this.queueBroadcastAllElements.cancel();
    this.loadImageFiles.cancel();
    this.resetErrorIndicator(true);

    if (this.portal.socket && this.fallbackInitializationHandler) {
      this.portal.socket.off(
        "connect_error",
        this.fallbackInitializationHandler,
      );
    }

    LocalData.fileStorage.reset();
    // Autosave stays paused until the scratch canvas is back on screen (or, when
    // switching boards, the next scene is loaded), or the board would overwrite it.
    this.destroySocketClient({ keepSavePaused: true });

    if (restoreLocalCanvas) {
      // ensure we prefer the scratch canvas over any state other tabs saved
      // while we were on the board
      resetBrowserStateVersions();
      window.history.pushState({}, APP_NAME, window.location.origin);
      this.restoreLocalCanvas();
    }
  };

  private restoreLocalCanvas = async () => {
    const elements = restoreElements(importFromLocalStorage().elements, null, {
      repairBindings: true,
    });
    this.sketchsyncAPI.updateScene({
      elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    LocalData.resumeSave("collaboration");
    const fileIds = elements.flatMap((element) =>
      isInitializedImageElement(element) ? [element.fileId] : [],
    );
    if (fileIds.length) {
      const { loadedFiles } = await LocalData.fileStorage.getFiles(fileIds);
      this.sketchsyncAPI.addFiles(loadedFiles);
    }
  };

  private destroySocketClient = (opts?: {
    isUnload?: boolean;
    keepSavePaused?: boolean;
  }) => {
    this.lastBroadcastedOrReceivedSceneVersion = -1;
    this.portal.close();
    this.fileManager.reset();
    this.followedBy = new Set();
    if (!opts?.isUnload) {
      appJotaiStore.set(currentBoardAtom, null);
      setBoardInvite(null);
      this.setIsCollaborating(false);
      this.setActiveRoomLink(null);
      appJotaiStore.set(userToFollowAtom, null);
      this.collaborators = new Map();
      this.sketchsyncAPI.updateScene({
        collaborators: this.collaborators,
      });
      if (!opts?.keepSavePaused) {
        LocalData.resumeSave("collaboration");
      }
    }
  };

  private fetchBoardImageFiles = async (opts: {
    elements: readonly SketchSyncElement[];
    /**
     * Indicates whether to fetch files that are errored or pending and older
     * than 10 seconds.
     *
     * Use this as a mechanism to fetch files which may be ok but for some
     * reason their status was not updated correctly.
     */
    forceFetchFiles?: boolean;
  }) => {
    const unfetchedImages = opts.elements
      .filter((element) => {
        return (
          isInitializedImageElement(element) &&
          !this.fileManager.isFileTracked(element.fileId) &&
          !element.isDeleted &&
          (opts.forceFetchFiles
            ? element.status !== "pending" ||
              Date.now() - element.updated > 10000
            : element.status === "saved")
        );
      })
      .map((element) => (element as InitializedSketchSyncImageElement).fileId);

    return await this.fileManager.getFiles(unfetchedImages);
  };

  private fallbackInitializationHandler: null | (() => any) = null;

  canEdit = () => {
    const board = appJotaiStore.get(currentBoardAtom);
    return !!board && board.role !== "viewer";
  };

  onSceneAck = (ack: { ok: boolean; error?: string }) => {
    if (ack.ok) {
      this.resetErrorIndicator();
    } else if (ack.error === "server_error") {
      this.setErrorIndicator(t("errors.collabSaveFailed"));
    }
  };

  private persistBoardLocally = throttle(
    () => {
      const board = appJotaiStore.get(currentBoardAtom);
      if (board && this.isCollaborating()) {
        boardCache.save(
          board,
          getSyncableElements(this.getSceneElementsIncludingDeleted()),
        );
      }
    },
    BOARD_CACHE_SAVE_TIMEOUT,
    { leading: false },
  );

  private updateBoardAccess = (access: {
    role: BoardInfo["role"];
    linkExpiresAt: string | null;
  }) => {
    const board = appJotaiStore.get(currentBoardAtom);
    if (board) {
      appJotaiStore.set(currentBoardAtom, { ...board, ...access });
    }
  };

  private onAccessLost = (reason: string) => {
    this.setErrorDialog(describeError(new ApiError(403, reason)));
    this.stopCollaboration();
  };

  private openBoard = async (link: BoardLinkData) => {
    setBoardInvite(link.inviteToken);
    try {
      return await api.getBoard(link.roomId);
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await boardCache.load(link.roomId);
        if (cached) {
          return cached.board;
        }
      }
      setBoardInvite(null);
      this.setErrorDialog(describeError(error));
      if (error instanceof ApiError && error.code === "sign_in_required") {
        appJotaiStore.set(accountDialogAtom, {
          isOpen: true,
          reason: "Sign in to open this board.",
          onSignedIn: () => window.location.reload(),
        });
      } else {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
      return null;
    }
  };

  private createBoardFromScene = async () => {
    if (!appJotaiStore.get(currentUserAtom)) {
      appJotaiStore.set(accountDialogAtom, {
        isOpen: true,
        reason:
          "Sign in to start a live board. Your current drawing comes with you.",
        onSignedIn: () => this.startCollaboration(null),
      });
      return null;
    }
    const elements = this.sketchsyncAPI.getSceneElements().map((element) => {
      if (isImageElement(element) && element.status === "saved") {
        return newElementWith(element, { status: "pending" });
      }
      return element;
    });
    // only non-deleted elements: something the user deleted before starting
    // the board must not be uploaded with it
    this.sketchsyncAPI.updateScene({
      elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    try {
      return await api.createBoard(
        `Board ${new Date().toLocaleDateString()}`,
        getSyncableElements(elements),
      );
    } catch (error) {
      this.setErrorDialog(describeError(error));
      return null;
    }
  };

  startCollaboration = async (existingRoomLinkData: null | BoardLinkData) => {
    if (this.portal.socket) {
      return null;
    }

    const board = existingRoomLinkData
      ? await this.openBoard(existingRoomLinkData)
      : await this.createBoardFromScene();
    if (!board) {
      this.setIsCollaborating(false);
      return null;
    }
    if (!existingRoomLinkData) {
      setBoardInvite(null);
      window.history.pushState(
        {},
        APP_NAME,
        getCollaborationLink({ roomId: board.id }),
      );
    }
    appJotaiStore.set(currentBoardAtom, board);

    const user = appJotaiStore.get(currentUserAtom);
    if (user) {
      this.setUsername(user.name);
    } else if (!this.state.username) {
      this.setUsername(getRandomUsername());
    }

    const roomId = board.id;
    const roomKey = board.fileKey;
    const roomLinkData = { roomId, inviteToken: getBoardInvite() };

    const scenePromise = resolvablePromise<
      | (ImportedDataState & { elements: readonly OrderedSketchSyncElement[] })
      | null
    >();

    this.setIsCollaborating(true);
    LocalData.pauseSave("collaboration");

    const { default: socketIOClient } = await import(
      /* webpackChunkName: "socketIoClient" */ "socket.io-client"
    );

    const fallbackInitializationHandler = () => {
      this.initializeRoom({
        roomLinkData,
        fetchScene: true,
      }).then((scene) => {
        scenePromise.resolve(scene);
      });
    };
    this.fallbackInitializationHandler = fallbackInitializationHandler;

    try {
      this.portal.socket = this.portal.open(
        socketIOClient(
          import.meta.env.VITE_APP_WS_SERVER_URL || window.location.origin,
          {
            transports: ["websocket", "polling"],
            auth: { invite: getBoardInvite() },
            withCredentials: true,
          },
        ),
        roomId,
        roomKey,
      );

      this.portal.socket.once("connect_error", fallbackInitializationHandler);
    } catch (error: any) {
      console.error(error);
      this.setErrorDialog(error.message);
      return null;
    }

    if (existingRoomLinkData) {
      // when joining existing room, don't merge it with current scene data
      this.sketchsyncAPI.resetScene();
      const cached = await boardCache.load(roomId);
      if (cached?.elements.length) {
        this.sketchsyncAPI.updateScene({
          elements: restoreElements(cached.elements, null),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    }

    // fallback in case the server doesn't answer with the board in time
    this.socketInitializationTimer = window.setTimeout(
      fallbackInitializationHandler,
      INITIAL_SCENE_UPDATE_TIMEOUT,
    );

    this.portal.socket.on("access", this.updateBoardAccess);
    this.portal.socket.on("access-denied", this.onAccessLost);
    this.portal.socket.on("access-revoked", this.onAccessLost);
    this.portal.socket.on("disconnect", (reason: string) => {
      const closedOnPurpose =
        reason === "io client disconnect" || reason === "io server disconnect";
      if (!closedOnPurpose && this.isCollaborating()) {
        this.setErrorIndicator(
          "Connection lost. Your changes are kept on this device and will sync when it's back.",
        );
      }
    });

    // All socket listeners are moving to Portal
    this.portal.socket.on(
      "client-broadcast",
      (data: ValueOf<SocketUpdateDataSource>) => {
        switch (data.type) {
          case WS_SUBTYPES.INVALID_RESPONSE:
            return;
          case WS_SUBTYPES.INIT: {
            const serverElements = toBrandedType<
              readonly RemoteSketchSyncElement[]
            >(data.payload.elements);
            const reconciledElements = this._reconcileElements(serverElements);
            if (!this.portal.socketInitialized) {
              this.initializeRoom({ fetchScene: false });
              this.handleRemoteSceneUpdate(reconciledElements);
              // noop if already resolved via the fallback
              scenePromise.resolve({
                elements: reconciledElements,
                scrollToContent: true,
              });
            } else {
              this.handleRemoteSceneUpdate(reconciledElements);
            }
            // (re)joined: send whatever we changed while the server couldn't
            // hear us, e.g. edits made offline
            this.portal.resetSyncState(serverElements);
            this.resetErrorIndicator();
            this.portal.broadcastScene(
              WS_SUBTYPES.UPDATE,
              this.getSceneElementsIncludingDeleted(),
              false,
            );
            break;
          }
          case WS_SUBTYPES.UPDATE: {
            const remoteElements = toBrandedType<
              readonly RemoteSketchSyncElement[]
            >(data.payload.elements);
            this.portal.markReceived(remoteElements);
            this.handleRemoteSceneUpdate(
              this._reconcileElements(remoteElements),
            );
            break;
          }
          case WS_SUBTYPES.MOUSE_LOCATION: {
            const { pointer, button, username, selectedElementIds } =
              data.payload;

            const socketId: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["socketId"] =
              data.payload.socketId ||
              // @ts-ignore legacy, see #2094 (#2097)
              data.payload.socketID;

            this.updateCollaborator(socketId, {
              pointer,
              button,
              selectedElementIds,
              username,
            });

            break;
          }

          case WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS: {
            const { sceneBounds, socketId } = data.payload;

            const userToFollow = appJotaiStore.get(userToFollowAtom);

            // we're not following the user
            // (shouldn't happen, but could be late message or bug upstream)
            if (userToFollow?.socketId !== socketId) {
              console.warn(
                `receiving remote client's (from ${socketId}) viewport bounds even though we're not subscribed to it!`,
              );
              return;
            }

            // cross-follow case, ignore updates in this case
            if (this.followedBy.has(userToFollow.socketId)) {
              return;
            }

            const appState = this.sketchsyncAPI.getAppState();

            this.sketchsyncAPI.updateScene({
              appState: zoomToFitBounds({
                appState,
                bounds: sceneBounds,
                fit: "contain",
              }).appState,
            });

            break;
          }

          case WS_SUBTYPES.IDLE_STATUS: {
            const { userState, socketId, username } = data.payload;
            this.updateCollaborator(socketId, {
              userState,
              username,
            });
            break;
          }

          default: {
            assertNever(data, null);
          }
        }
      },
    );

    this.portal.socket.on(
      WS_EVENTS.USER_FOLLOW_ROOM_CHANGE,
      (followedBy: SocketId[]) => {
        this.followedBy = new Set(followedBy);

        this.relayVisibleSceneBounds({ force: true });
      },
    );

    this.initializeIdleDetector();

    this.setActiveRoomLink(window.location.href);

    return scenePromise;
  };

  private initializeRoom = async ({
    fetchScene,
    roomLinkData,
  }:
    | {
        fetchScene: true;
        roomLinkData: BoardLinkData | null;
      }
    | { fetchScene: false; roomLinkData?: null }) => {
    clearTimeout(this.socketInitializationTimer!);
    if (this.portal.socket && this.fallbackInitializationHandler) {
      this.portal.socket.off(
        "connect_error",
        this.fallbackInitializationHandler,
      );
    }
    this.portal.socketInitialized = true;
    if (!fetchScene || !roomLinkData) {
      return null;
    }
    // The socket is slow or down: show the board from the API or, offline, this
    // device's copy. The socket keeps retrying and merges the server's state later.
    const elements = await api
      .getScene(roomLinkData.roomId)
      .catch(
        async () => (await boardCache.load(roomLinkData.roomId))?.elements,
      );
    if (!elements) {
      return null;
    }
    const restored = getSyncableElements(
      restoreElements(elements, null, { deleteInvisibleElements: true }),
    );
    this.setLastBroadcastedOrReceivedSceneVersion(getSceneVersion(restored));
    return { elements: restored, scrollToContent: true };
  };

  private _reconcileElements = (
    remoteElements: readonly RemoteSketchSyncElement[],
  ): ReconciledSketchSyncElement[] => {
    const appState = this.sketchsyncAPI.getAppState();

    const existingElements = this.getSceneElementsIncludingDeleted();

    // NOTE ideally we restore _after_ reconciliation but we can't do that
    // as we'd regenerate even elements such as appState.newElement which would
    // break the state
    remoteElements = restoreElements(remoteElements, existingElements);

    let reconciledElements = reconcileElements(
      existingElements,
      remoteElements,
      appState,
    );

    reconciledElements = bumpElementVersions(
      reconciledElements,
      existingElements,
    );

    // Avoid broadcasting to the rest of the collaborators the scene
    // we just received!
    // Note: this needs to be set before updating the scene as it
    // synchronously calls render.
    this.setLastBroadcastedOrReceivedSceneVersion(
      getSceneVersion(reconciledElements),
    );

    return reconciledElements;
  };

  private loadImageFiles = throttle(async () => {
    const { loadedFiles, erroredFiles } = await this.fetchBoardImageFiles({
      elements: this.sketchsyncAPI.getSceneElementsIncludingDeleted(),
    });

    this.sketchsyncAPI.addFiles(loadedFiles);

    updateStaleImageStatuses({
      sketchsyncAPI: this.sketchsyncAPI,
      erroredFiles,
      elements: this.sketchsyncAPI.getSceneElementsIncludingDeleted(),
    });
  }, LOAD_IMAGES_TIMEOUT);

  private handleRemoteSceneUpdate = (
    elements: ReconciledSketchSyncElement[],
  ) => {
    this.sketchsyncAPI.updateScene({
      elements,
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    this.loadImageFiles();
    this.persistBoardLocally();
  };

  private onPointerMove = () => {
    if (this.idleTimeoutId) {
      window.clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);

    if (!this.activeIntervalId) {
      this.activeIntervalId = window.setInterval(
        this.reportActive,
        ACTIVE_THRESHOLD,
      );
    }
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      if (this.idleTimeoutId) {
        window.clearTimeout(this.idleTimeoutId);
        this.idleTimeoutId = null;
      }
      if (this.activeIntervalId) {
        window.clearInterval(this.activeIntervalId);
        this.activeIntervalId = null;
      }
      this.onIdleStateChange(UserIdleState.AWAY);
    } else {
      this.idleTimeoutId = window.setTimeout(this.reportIdle, IDLE_THRESHOLD);
      this.activeIntervalId = window.setInterval(
        this.reportActive,
        ACTIVE_THRESHOLD,
      );
      this.onIdleStateChange(UserIdleState.ACTIVE);
    }
  };

  private reportIdle = () => {
    this.onIdleStateChange(UserIdleState.IDLE);
    if (this.activeIntervalId) {
      window.clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
  };

  private reportActive = () => {
    this.onIdleStateChange(UserIdleState.ACTIVE);
  };

  private initializeIdleDetector = () => {
    document.addEventListener(EVENT.POINTER_MOVE, this.onPointerMove);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, this.onVisibilityChange);
  };

  setCollaborators(sockets: SocketId[]) {
    const collaborators: InstanceType<typeof Collab>["collaborators"] =
      new Map();
    for (const socketId of sockets) {
      const isCurrentUser = socketId === this.portal.socket?.id;
      collaborators.set(
        socketId,
        Object.assign(
          // we never receive our own broadcasts, so we need to seed
          // our own collaborator entry with the local username
          isCurrentUser ? { username: this.state.username } : {},
          this.collaborators.get(socketId),
          { isCurrentUser },
        ),
      );
    }
    this.collaborators = collaborators;
    this.sketchsyncAPI.updateScene({ collaborators });

    // unfollow if the followed user left the room
    const userToFollow = appJotaiStore.get(userToFollowAtom);
    if (userToFollow && !collaborators.has(userToFollow.socketId)) {
      this.setUserToFollow(null);
    }
  }

  updateCollaborator = (socketId: SocketId, updates: Partial<Collaborator>) => {
    const isCurrentUser = socketId === this.portal.socket?.id;
    const collaborators = new Map(this.collaborators);
    const user: Mutable<Collaborator> = Object.assign(
      // we never receive our own broadcasts, so we need to seed
      // our own collaborator entry with the local username
      isCurrentUser ? { username: this.state.username } : {},
      collaborators.get(socketId),
      updates,
      { isCurrentUser },
    );
    collaborators.set(socketId, user);
    this.collaborators = collaborators;

    this.sketchsyncAPI.updateScene({
      collaborators,
    });
  };

  public setLastBroadcastedOrReceivedSceneVersion = (version: number) => {
    this.lastBroadcastedOrReceivedSceneVersion = version;
  };

  public getLastBroadcastedOrReceivedSceneVersion = () => {
    return this.lastBroadcastedOrReceivedSceneVersion;
  };

  public getSceneElementsIncludingDeleted = () => {
    return this.sketchsyncAPI.getSceneElementsIncludingDeleted();
  };

  onPointerUpdate = throttle(
    (payload: {
      pointer: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["pointer"];
      button: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["button"];
      pointersMap: Gesture["pointers"];
    }) => {
      payload.pointersMap.size < 2 &&
        this.portal.socket &&
        this.portal.broadcastMouseLocation(payload);
    },
    CURSOR_SYNC_TIMEOUT,
  );

  relayVisibleSceneBounds = (props?: { force: boolean }) => {
    if (this.portal.socket && (this.followedBy.size > 0 || props?.force)) {
      this.portal.broadcastVisibleSceneBounds(
        {
          sceneBounds: getVisibleSceneBounds(this.sketchsyncAPI.getAppState()),
        },
        `follow@${this.portal.socket.id}`,
      );
    }
  };

  onIdleStateChange = (userState: UserIdleState) => {
    this.portal.broadcastIdleChange(userState);
  };

  // Compares per-element versions, not the scene-wide version sum: a remote update
  // merged in the same batch window would make a local change look already sent.
  broadcastElements = (elements: readonly OrderedSketchSyncElement[]) => {
    this.portal.broadcastScene(WS_SUBTYPES.UPDATE, elements, false);
    this.lastBroadcastedOrReceivedSceneVersion = getSceneVersion(elements);
    this.queueBroadcastAllElements();
  };

  syncElements = (_elements: readonly OrderedSketchSyncElement[]) => {
    this.queueBroadcastChanges();
    this.persistBoardLocally();
  };

  private queueBroadcastChanges = throttle(
    () => this.broadcastElements(this.getSceneElementsIncludingDeleted()),
    SCENE_BROADCAST_BATCH_MS,
  );

  // Safety net: retries anything the server hasn't acknowledged (a failed or
  // timed-out send rolls its versions back), without resending the board.
  queueBroadcastAllElements = throttle(() => {
    this.portal.broadcastScene(
      WS_SUBTYPES.UPDATE,
      this.sketchsyncAPI.getSceneElementsIncludingDeleted(),
      false,
    );
  }, SYNC_FULL_SCENE_INTERVAL_MS);

  setUserToFollow = (userToFollow: UserToFollow | null) => {
    const prev = appJotaiStore.get(userToFollowAtom) ?? null;

    if (prev?.socketId !== userToFollow?.socketId && this.portal.socket) {
      // leave the previous user's follow room before joining the next one
      if (prev) {
        this.portal.broadcastUserFollowed({
          userToFollow: prev,
          action: "UNFOLLOW",
        });
      }
      if (userToFollow) {
        this.portal.broadcastUserFollowed({
          userToFollow,
          action: "FOLLOW",
        });
      }
    }

    appJotaiStore.set(userToFollowAtom, userToFollow);
  };

  setUsername = (username: string) => {
    this.setState({ username });
    saveUsernameToLocalStorage(username);

    // keep our own collaborator entry in sync
    const socketId = this.portal.socket?.id as SocketId | undefined;
    if (socketId && this.collaborators.has(socketId)) {
      this.updateCollaborator(socketId, { username });
    }
  };

  getUsername = () => this.state.username;

  setActiveRoomLink = (activeRoomLink: string | null) => {
    this.setState({ activeRoomLink });
    appJotaiStore.set(activeRoomLinkAtom, activeRoomLink);
  };

  getActiveRoomLink = () => this.state.activeRoomLink;

  setErrorIndicator = (errorMessage: string | null) => {
    appJotaiStore.set(collabErrorIndicatorAtom, {
      message: errorMessage,
      nonce: Date.now(),
    });
  };

  resetErrorIndicator = (resetDialogNotifiedErrors = false) => {
    appJotaiStore.set(collabErrorIndicatorAtom, { message: null, nonce: 0 });
    if (resetDialogNotifiedErrors) {
      this.setState({
        dialogNotifiedErrors: {},
      });
    }
  };

  setErrorDialog = (errorMessage: string | null) => {
    this.setState({
      errorMessage,
    });
  };

  render() {
    const { errorMessage } = this.state;

    return (
      <>
        {errorMessage != null && (
          <ErrorDialog onClose={() => this.setErrorDialog(null)}>
            {errorMessage}
          </ErrorDialog>
        )}
      </>
    );
  }
}

declare global {
  interface Window {
    collab: InstanceType<typeof Collab>;
  }
}

if (isTestEnv() || isDevEnv()) {
  window.collab = window.collab || ({} as Window["collab"]);
}

export default Collab;

export type TCollabClass = Collab;
