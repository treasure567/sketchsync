import { atLeast, isDenial, isExpired, resolveAccess } from "./access.ts";
import { userFromCookieHeader } from "./auth.ts";
import { isSceneElement, orderedElements } from "./elements.ts";
import { isValidId } from "./ids.ts";
import {
  applyUpdate,
  cancelUnload,
  forgetRoom,
  getRoom,
  scheduleUnload,
} from "./rooms.ts";

import type { AccessDenial, BoardAccess } from "./access.ts";
import type { User } from "./auth.ts";
import type { Server, Socket } from "socket.io";

type SocketData = {
  user: User | null;
  invite: string | null;
  boardId: string | null;
  access: BoardAccess | null;
  expiryTimer: NodeJS.Timeout | null;
};

type CollabSocket = Socket<any, any, any, SocketData>;
type CollabServer = Server<any, any, any, SocketData>;

type Message = { type: string; payload: Record<string, unknown> };

type Ack = (response: { ok: boolean; error?: string }) => void;

const SCENE_MESSAGES = new Set(["SCENE_INIT", "SCENE_UPDATE"]);
const PRESENCE_MESSAGES = new Set([
  "MOUSE_LOCATION",
  "IDLE_STATUS",
  "USER_VISIBLE_SCENE_BOUNDS",
]);
const FOLLOW_ROOM_PREFIX = "follow@";
const MAX_GUEST_NAME_LENGTH = 50;
const MAX_TIMER_MS = 2 ** 31 - 1;

const isMessage = (value: unknown): value is Message => {
  const message = value as Message | null;
  return (
    typeof message?.type === "string" &&
    typeof message.payload === "object" &&
    message.payload !== null
  );
};

const displayName = (socket: CollabSocket, claimed: unknown) => {
  if (socket.data.user) {
    return socket.data.user.name;
  }
  return typeof claimed === "string" && claimed.trim()
    ? claimed.trim().slice(0, MAX_GUEST_NAME_LENGTH)
    : "Guest";
};

const socketIds = async (io: CollabServer, room: string) =>
  (await io.in(room).fetchSockets()).map((socket) => socket.id);

const localSockets = (io: CollabServer, room: string) =>
  [...(io.of("/").adapter.rooms.get(room) ?? [])]
    .map((id) => io.of("/").sockets.get(id))
    .filter((socket): socket is CollabSocket => !!socket);

export const createCollab = (
  io: CollabServer,
  options: { crossInstance: boolean },
) => {
  const revoke = (socket: CollabSocket, reason: AccessDenial) => {
    clearTimeout(socket.data.expiryTimer ?? undefined);
    socket.data.access = null;
    socket.emit("access-revoked", reason);
    socket.disconnect(true);
  };

  const recheck = async (socket: CollabSocket) => {
    const { boardId } = socket.data;
    if (!boardId) {
      return;
    }
    const result = await resolveAccess(
      boardId,
      socket.data.user?.id ?? null,
      socket.data.invite,
    );
    if (isDenial(result)) {
      revoke(socket, result);
    } else if (
      result.role !== socket.data.access?.role ||
      result.linkExpiresAt?.getTime() !==
        socket.data.access?.linkExpiresAt?.getTime()
    ) {
      grant(socket, result);
    }
  };

  const grant = (socket: CollabSocket, access: BoardAccess) => {
    clearTimeout(socket.data.expiryTimer ?? undefined);
    socket.data.access = access;
    socket.data.expiryTimer = access.linkExpiresAt
      ? setTimeout(
          () => void recheck(socket),
          Math.min(access.linkExpiresAt.getTime() - Date.now(), MAX_TIMER_MS),
        )
      : null;
    socket.emit("access", {
      role: access.role,
      linkExpiresAt: access.linkExpiresAt,
    });
  };

  // Every message goes through this. Expiry is checked here as well as by the
  // timer, so a link can't outlive its deadline even if a timer is late.
  const currentAccess = (socket: CollabSocket, boardId: unknown) => {
    const { access } = socket.data;
    if (!access || boardId !== socket.data.boardId) {
      return null;
    }
    if (isExpired(access)) {
      revoke(socket, "link_expired");
      return null;
    }
    return access;
  };

  const recheckBoard = async (boardId: string) => {
    await Promise.all(localSockets(io, boardId).map(recheck));
  };

  if (options.crossInstance) {
    io.on("access-changed", (boardId: string) => void recheckBoard(boardId));
  }

  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromCookieHeader(
        socket.handshake.headers.cookie,
      );
      const invite = socket.handshake.auth?.invite;
      socket.data.invite = isValidId(invite) ? invite : null;
      socket.data.boardId = null;
      socket.data.access = null;
      socket.data.expiryTimer = null;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", (socket: CollabSocket) => {
    socket.emit("init-room");

    socket.on("join-room", async (boardId: unknown) => {
      if (!isValidId(boardId) || socket.data.boardId) {
        return;
      }
      const result = await resolveAccess(
        boardId,
        socket.data.user?.id ?? null,
        socket.data.invite,
      );
      if (isDenial(result)) {
        socket.emit("access-denied", result);
        return;
      }
      socket.data.boardId = boardId;
      grant(socket, result);
      cancelUnload(boardId);
      const room = await getRoom(boardId);
      // Join before reading the state: an update that lands in between is
      // then delivered twice rather than missed, and merging twice is harmless.
      await socket.join(boardId);
      socket.emit("client-broadcast", {
        type: "SCENE_INIT",
        payload: { elements: orderedElements(room.elements.values()) },
      });
      io.in(boardId).emit("room-user-change", await socketIds(io, boardId));
    });

    socket.on(
      "server-broadcast",
      async (boardId: unknown, message: unknown, ack: unknown) => {
        const reply: Ack = typeof ack === "function" ? (ack as Ack) : () => {};
        const access = currentAccess(socket, boardId);
        if (!access) {
          reply({ ok: false, error: "forbidden" });
          return;
        }
        if (!atLeast(access.role, "editor")) {
          reply({ ok: false, error: "read_only" });
          return;
        }
        const elements = isMessage(message) && message.payload.elements;
        if (
          !isMessage(message) ||
          !SCENE_MESSAGES.has(message.type) ||
          !Array.isArray(elements) ||
          !elements.every(isSceneElement)
        ) {
          reply({ ok: false, error: "bad_message" });
          return;
        }
        try {
          const accepted = await applyUpdate(
            access.boardId,
            elements,
            socket.data.user?.id ?? null,
          );
          if (accepted.length) {
            socket.to(access.boardId).emit("client-broadcast", {
              type: "SCENE_UPDATE",
              payload: { elements: accepted },
            });
          }
          reply({ ok: true });
        } catch (error) {
          console.error(error);
          reply({ ok: false, error: "server_error" });
        }
      },
    );

    socket.on(
      "server-volatile-broadcast",
      (roomId: unknown, message: unknown) => {
        const access = currentAccess(socket, socket.data.boardId);
        if (
          !access ||
          !isMessage(message) ||
          !PRESENCE_MESSAGES.has(message.type)
        ) {
          return;
        }
        const target =
          message.type === "USER_VISIBLE_SCENE_BOUNDS"
            ? `${FOLLOW_ROOM_PREFIX}${socket.id}`
            : access.boardId;
        if (roomId !== target) {
          return;
        }
        socket.volatile.to(target).emit("client-broadcast", {
          type: message.type,
          payload: {
            ...message.payload,
            socketId: socket.id,
            username: displayName(socket, message.payload.username),
          },
        });
      },
    );

    socket.on("user-follow", async (payload: unknown) => {
      const follow = payload as {
        userToFollow?: { socketId?: unknown };
        action?: unknown;
      } | null;
      const leaderId = follow?.userToFollow?.socketId;
      const access = currentAccess(socket, socket.data.boardId);
      if (
        !access ||
        typeof leaderId !== "string" ||
        (follow?.action !== "FOLLOW" && follow?.action !== "UNFOLLOW") ||
        !(await socketIds(io, access.boardId)).includes(leaderId)
      ) {
        return;
      }
      const followRoom = `${FOLLOW_ROOM_PREFIX}${leaderId}`;
      if (follow.action === "FOLLOW") {
        await socket.join(followRoom);
      } else {
        await socket.leave(followRoom);
      }
      io.to(leaderId).emit(
        "user-follow-room-change",
        await socketIds(io, followRoom),
      );
    });

    socket.on("disconnecting", async () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) {
          continue;
        }
        const others = (await socketIds(io, roomId)).filter(
          (id) => id !== socket.id,
        );
        if (roomId.startsWith(FOLLOW_ROOM_PREFIX)) {
          if (others.length === 0) {
            io.to(roomId.slice(FOLLOW_ROOM_PREFIX.length)).emit(
              "broadcast-unfollow",
            );
          }
        } else if (others.length > 0) {
          socket.to(roomId).emit("room-user-change", others);
        }
      }
    });

    socket.on("disconnect", () => {
      clearTimeout(socket.data.expiryTimer ?? undefined);
      const { boardId } = socket.data;
      if (boardId && localSockets(io, boardId).length === 0) {
        scheduleUnload(boardId, () => localSockets(io, boardId).length > 0);
      }
    });
  });

  return {
    accessChanged: async (boardId: string) => {
      if (options.crossInstance) {
        io.serverSideEmit("access-changed", boardId);
      }
      await recheckBoard(boardId);
    },
    boardDeleted: (boardId: string) => {
      io.in(boardId).emit("access-revoked", "not_found");
      io.in(boardId).disconnectSockets(true);
      forgetRoom(boardId);
    },
  };
};

export type Collab = ReturnType<typeof createCollab>;
