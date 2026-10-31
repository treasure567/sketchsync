import express from "express";

import { atLeast, isDenial, resolveAccess } from "../access.ts";
import { requireUser } from "../auth.ts";
import {
  createBoard,
  createLink,
  deleteBoard,
  findUserIdByEmail,
  getBoard,
  listBoards,
  listLinks,
  listMembers,
  removeMember,
  renameBoard,
  revokeLink,
  setMemberRole,
} from "../boards.ts";
import { isSceneElement, orderedElements } from "../elements.ts";
import { isValidId } from "../ids.ts";
import {
  createVersion,
  currentElements,
  getVersionElements,
  listVersions,
  restoreVersion,
} from "../rooms.ts";
import { isEmail, isOptionalLabel, isTitle } from "../validation.ts";

import type { AccessDenial, BoardAccess, Role } from "../access.ts";
import type { Collab } from "../collab.ts";
import type { NextFunction, Request, Response } from "express";

const DENIAL_STATUS: Record<AccessDenial, number> = {
  not_found: 404,
  sign_in_required: 401,
  forbidden: 403,
  link_expired: 410,
};

const MAX_LINK_MINUTES = 365 * 24 * 60;

type MemberRole = Exclude<Role, "owner">;

const isMemberRole = (value: unknown): value is MemberRole =>
  value === "editor" || value === "viewer";

const isLinkExpiry = (value: unknown): value is number | null =>
  value === null ||
  (Number.isSafeInteger(value) &&
    (value as number) > 0 &&
    (value as number) <= MAX_LINK_MINUTES);

// Invite tokens travel in a header rather than the URL so they don't end up in
// access logs or browser history.
const inviteToken = (req: Request) => {
  const token = req.get("x-board-invite");
  return isValidId(token) ? token : null;
};

const accessOf = (res: Response) => res.locals.access as BoardAccess;

const param = (req: Request, name: string) => String(req.params[name]);

const requireRole =
  (minimum: Role) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { boardId } = req.params;
    if (!isValidId(boardId)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const result = await resolveAccess(
      boardId,
      req.user?.id ?? null,
      inviteToken(req),
    );
    if (isDenial(result)) {
      res.status(DENIAL_STATUS[result]).json({ error: result });
      return;
    }
    if (!atLeast(result.role, minimum)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    res.locals.access = result;
    next();
  };

export const boardRoutes = (collab: Collab) => {
  const router = express.Router();

  router.get("/", requireUser, async (req, res) => {
    res.json({ boards: await listBoards(req.user!.id) });
  });

  router.post("/", requireUser, async (req, res) => {
    const { title, elements } = req.body ?? {};
    if (
      (title !== undefined && !isTitle(title)) ||
      (elements !== undefined &&
        !(Array.isArray(elements) && elements.every(isSceneElement)))
    ) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const boardTitle = title?.trim() ?? "Untitled board";
    const id = await createBoard(req.user!.id, boardTitle, elements ?? []);
    const board = await getBoard(id);
    res.status(201).json({
      board: {
        id,
        title: boardTitle,
        role: "owner",
        fileKey: board!.file_key,
        ownerName: req.user!.name,
        linkExpiresAt: null,
      },
    });
  });

  router.get("/:boardId", requireRole("viewer"), async (req, res) => {
    const access = accessOf(res);
    const board = await getBoard(access.boardId);
    if (!board) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      board: {
        id: board.id,
        title: board.title,
        role: access.role,
        fileKey: board.file_key,
        ownerName: board.owner_name,
        linkExpiresAt: access.linkExpiresAt,
      },
    });
  });

  router.patch("/:boardId", requireRole("editor"), async (req, res) => {
    const { title } = req.body ?? {};
    if (!isTitle(title)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    await renameBoard(accessOf(res).boardId, title.trim());
    res.sendStatus(204);
  });

  router.delete("/:boardId", requireRole("owner"), async (_req, res) => {
    const { boardId } = accessOf(res);
    collab.boardDeleted(boardId);
    await deleteBoard(boardId);
    res.sendStatus(204);
  });

  router.get("/:boardId/scene", requireRole("viewer"), async (_req, res) => {
    const elements = await currentElements(accessOf(res).boardId);
    res.json({ elements: orderedElements(elements?.values() ?? []) });
  });

  router.get("/:boardId/members", requireRole("viewer"), async (_req, res) => {
    res.json({ members: await listMembers(accessOf(res).boardId) });
  });

  router.post("/:boardId/members", requireRole("owner"), async (req, res) => {
    const { email, role } = req.body ?? {};
    if (!isEmail(email) || !isMemberRole(role)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const { boardId } = accessOf(res);
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      res.status(404).json({ error: "no_account" });
      return;
    }
    if (userId === req.user?.id) {
      res.status(400).json({ error: "already_owner" });
      return;
    }
    await setMemberRole(boardId, userId, role);
    await collab.accessChanged(boardId);
    res.status(201).json({ members: await listMembers(boardId) });
  });

  router.patch(
    "/:boardId/members/:userId",
    requireRole("owner"),
    async (req, res) => {
      const { role } = req.body ?? {};
      if (!isMemberRole(role)) {
        res.status(400).json({ error: "invalid_input" });
        return;
      }
      const { boardId } = accessOf(res);
      await setMemberRole(boardId, param(req, "userId"), role);
      await collab.accessChanged(boardId);
      res.json({ members: await listMembers(boardId) });
    },
  );

  router.delete(
    "/:boardId/members/:userId",
    requireRole("viewer"),
    async (req, res) => {
      const { boardId, role } = accessOf(res);
      const removingSelf = param(req, "userId") === req.user?.id;
      if (!removingSelf && role !== "owner") {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      await removeMember(boardId, param(req, "userId"));
      await collab.accessChanged(boardId);
      res.sendStatus(204);
    },
  );

  router.get("/:boardId/links", requireRole("owner"), async (_req, res) => {
    res.json({ links: await listLinks(accessOf(res).boardId) });
  });

  router.post("/:boardId/links", requireRole("owner"), async (req, res) => {
    const { role, expiresInMinutes = null } = req.body ?? {};
    if (!isMemberRole(role) || !isLinkExpiry(expiresInMinutes)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const link = await createLink(
      accessOf(res).boardId,
      role,
      expiresInMinutes,
      req.user!.id,
    );
    res.status(201).json({ link });
  });

  router.delete(
    "/:boardId/links/:token",
    requireRole("owner"),
    async (req, res) => {
      const { boardId } = accessOf(res);
      await revokeLink(boardId, param(req, "token"));
      await collab.accessChanged(boardId);
      res.sendStatus(204);
    },
  );

  router.get("/:boardId/versions", requireRole("viewer"), async (_req, res) => {
    res.json({ versions: await listVersions(accessOf(res).boardId) });
  });

  router.post("/:boardId/versions", requireRole("editor"), async (req, res) => {
    const { label } = req.body ?? {};
    if (!isOptionalLabel(label)) {
      res.status(400).json({ error: "invalid_input" });
      return;
    }
    const version = await createVersion(
      accessOf(res).boardId,
      label?.trim() || null,
      req.user?.id ?? null,
    );
    res.status(201).json({ version });
  });

  router.get(
    "/:boardId/versions/:versionId",
    requireRole("viewer"),
    async (req, res) => {
      const elements = /^\d+$/.test(param(req, "versionId"))
        ? await getVersionElements(
            accessOf(res).boardId,
            param(req, "versionId"),
          )
        : null;
      if (!elements) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ elements });
    },
  );

  router.post(
    "/:boardId/versions/:versionId/restore",
    requireRole("editor"),
    async (req, res) => {
      const restored = /^\d+$/.test(param(req, "versionId"))
        ? await restoreVersion(
            accessOf(res).boardId,
            param(req, "versionId"),
            req.user?.id ?? null,
          )
        : null;
      if (restored === null) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ changedElements: restored });
    },
  );

  return router;
};
