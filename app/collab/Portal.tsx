import { CaptureUpdateAction } from "@sketchsync/editor";
import { trackEvent } from "@sketchsync/editor/analytics";
import { newElementWith } from "@sketchsync/element";
import throttle from "lodash.throttle";

import type { UserIdleState } from "@sketchsync/common";
import type { OrderedSketchSyncElement } from "@sketchsync/element/types";
import type { OnUserFollowedPayload, SocketId } from "@sketchsync/editor/types";

import {
  WS_EVENTS,
  FILE_UPLOAD_TIMEOUT,
  WS_SUBTYPES,
  SCENE_ACK_TIMEOUT,
} from "../app_constants";
import { isSyncableElement } from "../data";

import type {
  SocketUpdateData,
  SocketUpdateDataSource,
  SyncableSketchSyncElement,
} from "../data";
import type { TCollabClass } from "./Collab";
import type { Socket } from "socket.io-client";

type SceneAck = { ok: boolean; error?: string };

class Portal {
  collab: TCollabClass;
  socket: Socket | null = null;
  socketInitialized: boolean = false; // we don't want the socket to emit any updates until it is fully initialized
  roomId: string | null = null;
  roomKey: string | null = null;
  // Versions sent to the server (optimistic) and versions it confirmed. A
  // failed or unanswered send rolls `sent` back so the next sync retries it.
  broadcastedElementVersions: Map<string, number> = new Map();
  acknowledgedElementVersions: Map<string, number> = new Map();
  // One scene message in flight at a time, so on a slow connection changes batch
  // up while waiting for the ack instead of queueing as separate messages.
  private sceneInFlight = false;
  private scenePending = false;

  constructor(collab: TCollabClass) {
    this.collab = collab;
  }

  open(socket: Socket, id: string, key: string) {
    this.socket = socket;
    this.roomId = id;
    this.roomKey = key;

    this.socket.on("init-room", () => {
      if (this.socket) {
        this.socket.emit("join-room", this.roomId);
        trackEvent("share", "room joined");
      }
    });
    this.socket.on("room-user-change", (clients: SocketId[]) => {
      this.collab.setCollaborators(clients);
    });

    return socket;
  }

  close() {
    if (!this.socket) {
      return;
    }
    this.queueFileUpload.flush();
    this.socket.close();
    this.socket = null;
    this.roomId = null;
    this.roomKey = null;
    this.socketInitialized = false;
    this.broadcastedElementVersions = new Map();
    this.acknowledgedElementVersions = new Map();
    this.sceneInFlight = false;
    this.scenePending = false;
  }

  isOpen() {
    return !!(
      this.socketInitialized &&
      this.socket &&
      this.roomId &&
      this.roomKey
    );
  }

  // After (re)joining, the server's copy is the baseline: anything we hold
  // with a higher version is ours to send, everything else is already there.
  resetSyncState(serverElements: readonly OrderedSketchSyncElement[]) {
    this.broadcastedElementVersions = new Map(
      serverElements.map((element) => [element.id, element.version]),
    );
    this.acknowledgedElementVersions = new Map(this.broadcastedElementVersions);
  }

  markReceived(elements: readonly OrderedSketchSyncElement[]) {
    for (const element of elements) {
      for (const versions of [
        this.broadcastedElementVersions,
        this.acknowledgedElementVersions,
      ]) {
        if ((versions.get(element.id) ?? -1) < element.version) {
          versions.set(element.id, element.version);
        }
      }
    }
  }

  isSynced(elements: readonly OrderedSketchSyncElement[]) {
    return elements.every(
      (element) =>
        !isSyncableElement(element) ||
        (this.acknowledgedElementVersions.get(element.id) ?? -1) >=
          element.version,
    );
  }

  private emitVolatile(data: SocketUpdateData, roomId?: string) {
    if (this.isOpen() && this.socket?.connected) {
      this.socket.emit(WS_EVENTS.SERVER_VOLATILE, roomId ?? this.roomId, data);
    }
  }

  private async emitScene(
    data: SocketUpdateData,
    elements: readonly SyncableSketchSyncElement[],
  ) {
    const socket = this.socket;
    let ack: SceneAck;
    try {
      ack = await socket!
        .timeout(SCENE_ACK_TIMEOUT)
        .emitWithAck(WS_EVENTS.SERVER, this.roomId, data);
    } catch {
      ack = { ok: false, error: "timeout" };
    }
    if (socket !== this.socket) {
      return;
    }
    for (const element of elements) {
      if (ack.ok) {
        if (
          (this.acknowledgedElementVersions.get(element.id) ?? -1) <
          element.version
        ) {
          this.acknowledgedElementVersions.set(element.id, element.version);
        }
      } else if (
        this.broadcastedElementVersions.get(element.id) === element.version
      ) {
        const acknowledged = this.acknowledgedElementVersions.get(element.id);
        if (acknowledged === undefined) {
          this.broadcastedElementVersions.delete(element.id);
        } else {
          this.broadcastedElementVersions.set(element.id, acknowledged);
        }
      }
    }
    this.collab.onSceneAck(ack);
  }

  queueFileUpload = throttle(async () => {
    try {
      await this.collab.fileManager.saveFiles({
        elements: this.collab.sketchsyncAPI.getSceneElementsIncludingDeleted(),
        files: this.collab.sketchsyncAPI.getFiles(),
      });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        this.collab.sketchsyncAPI.updateScene({
          appState: {
            errorMessage: error.message,
          },
        });
      }
    }

    let isChanged = false;
    const newElements = this.collab.sketchsyncAPI
      .getSceneElementsIncludingDeleted()
      .map((element) => {
        if (this.collab.fileManager.shouldUpdateImageElementStatus(element)) {
          isChanged = true;
          // this will signal collaborators to pull image data from server
          // (using mutation instead of newElementWith otherwise it'd break
          // in-progress dragging)
          return newElementWith(element, { status: "saved" });
        }
        return element;
      });

    if (isChanged) {
      this.collab.sketchsyncAPI.updateScene({
        elements: newElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  }, FILE_UPLOAD_TIMEOUT);

  broadcastScene = async (
    updateType: WS_SUBTYPES.INIT | WS_SUBTYPES.UPDATE,
    elements: readonly OrderedSketchSyncElement[],
    syncAll: boolean,
  ) => {
    if (!this.isOpen() || !this.socket?.connected || !this.collab.canEdit()) {
      return;
    }
    if (this.sceneInFlight) {
      this.scenePending = true;
      return;
    }

    const syncableElements = elements.reduce((acc, element) => {
      if (
        (syncAll ||
          !this.broadcastedElementVersions.has(element.id) ||
          element.version > this.broadcastedElementVersions.get(element.id)!) &&
        isSyncableElement(element)
      ) {
        acc.push(element);
      }
      return acc;
    }, [] as SyncableSketchSyncElement[]);

    if (!syncableElements.length) {
      return;
    }

    for (const syncableElement of syncableElements) {
      this.broadcastedElementVersions.set(
        syncableElement.id,
        syncableElement.version,
      );
    }

    this.queueFileUpload();

    const data: SocketUpdateDataSource[typeof updateType] = {
      type: updateType,
      payload: {
        elements: syncableElements,
      },
    };
    this.sceneInFlight = true;
    try {
      await this.emitScene(data as SocketUpdateData, syncableElements);
    } finally {
      this.sceneInFlight = false;
    }
    if (this.scenePending) {
      this.scenePending = false;
      this.broadcastScene(
        WS_SUBTYPES.UPDATE,
        this.collab.getSceneElementsIncludingDeleted(),
        false,
      );
    }
  };

  broadcastIdleChange = (userState: UserIdleState) => {
    if (this.socket?.id) {
      const data: SocketUpdateDataSource["IDLE_STATUS"] = {
        type: WS_SUBTYPES.IDLE_STATUS,
        payload: {
          socketId: this.socket.id as SocketId,
          userState,
          username: this.collab.state.username,
        },
      };
      this.emitVolatile(data as SocketUpdateData);
    }
  };

  broadcastMouseLocation = (payload: {
    pointer: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["pointer"];
    button: SocketUpdateDataSource["MOUSE_LOCATION"]["payload"]["button"];
  }) => {
    if (this.socket?.id) {
      const data: SocketUpdateDataSource["MOUSE_LOCATION"] = {
        type: WS_SUBTYPES.MOUSE_LOCATION,
        payload: {
          socketId: this.socket.id as SocketId,
          pointer: payload.pointer,
          button: payload.button || "up",
          selectedElementIds:
            this.collab.sketchsyncAPI.getAppState().selectedElementIds,
          username: this.collab.state.username,
        },
      };
      this.emitVolatile(data as SocketUpdateData);
    }
  };

  broadcastVisibleSceneBounds = (
    payload: {
      sceneBounds: SocketUpdateDataSource["USER_VISIBLE_SCENE_BOUNDS"]["payload"]["sceneBounds"];
    },
    roomId: string,
  ) => {
    if (this.socket?.id) {
      const data: SocketUpdateDataSource["USER_VISIBLE_SCENE_BOUNDS"] = {
        type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS,
        payload: {
          socketId: this.socket.id as SocketId,
          username: this.collab.state.username,
          sceneBounds: payload.sceneBounds,
        },
      };
      this.emitVolatile(data as SocketUpdateData, roomId);
    }
  };

  broadcastUserFollowed = (payload: OnUserFollowedPayload) => {
    if (this.socket?.id) {
      this.socket.emit(WS_EVENTS.USER_FOLLOW_CHANGE, payload);
    }
  };
}

export default Portal;
