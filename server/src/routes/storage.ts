import express from "express";

import { atLeast, isDenial, resolveAccess } from "../access.ts";
import { config } from "../config.ts";
import { isValidId } from "../ids.ts";
import {
  createShareLink,
  getFile,
  getShareLink,
  saveFile,
} from "../storage.ts";

import type { Role } from "../access.ts";
import type { Request, Response } from "express";

const rawBody = (limit: number) => express.raw({ type: () => true, limit });

const sendBinary = (res: Response, data: Buffer) =>
  res.type("application/octet-stream").send(data);

const hasBody = (req: Request) =>
  Buffer.isBuffer(req.body) && req.body.length > 0;

const canUseBoardFiles = async (req: Request, minimum: Role) => {
  const { boardId } = req.params;
  if (!isValidId(boardId)) {
    return false;
  }
  const invite = req.get("x-board-invite");
  const result = await resolveAccess(
    boardId,
    req.user?.id ?? null,
    isValidId(invite) ? invite : null,
  );
  return !isDenial(result) && atLeast(result.role, minimum);
};

export const storageRoutes = () => {
  const router = express.Router();

  router.get("/files/rooms/:boardId/:fileId", async (req, res) => {
    if (
      !isValidId(req.params.fileId) ||
      !(await canUseBoardFiles(req, "viewer"))
    ) {
      res.sendStatus(404);
      return;
    }
    const data = await getFile(
      `rooms/${req.params.boardId}`,
      req.params.fileId,
    );
    if (!data) {
      res.sendStatus(404);
      return;
    }
    res.set("Cache-Control", "private, max-age=31536000, immutable");
    sendBinary(res, data);
  });

  router.put(
    "/files/rooms/:boardId/:fileId",
    rawBody(config.maxFileBytes),
    async (req, res) => {
      if (
        !isValidId(req.params.fileId) ||
        !hasBody(req) ||
        !(await canUseBoardFiles(req, "editor"))
      ) {
        res.sendStatus(403);
        return;
      }
      await saveFile(
        `rooms/${req.params.boardId}`,
        req.params.fileId,
        req.body,
      );
      res.sendStatus(204);
    },
  );

  // Read-only share links are end-to-end encrypted by the browser (the key is
  // in the link's #fragment), so their files need no access check.
  router.get("/files/shareLinks/:linkId/:fileId", async (req, res) => {
    const { linkId, fileId } = req.params;
    if (!isValidId(linkId) || !isValidId(fileId)) {
      res.sendStatus(400);
      return;
    }
    const data = await getFile(`shareLinks/${linkId}`, fileId);
    if (!data) {
      res.sendStatus(404);
      return;
    }
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    sendBinary(res, data);
  });

  router.put(
    "/files/shareLinks/:linkId/:fileId",
    rawBody(config.maxFileBytes),
    async (req, res) => {
      const { linkId, fileId } = req.params;
      if (!isValidId(linkId) || !isValidId(fileId) || !hasBody(req)) {
        res.sendStatus(400);
        return;
      }
      await saveFile(`shareLinks/${linkId}`, fileId, req.body);
      res.sendStatus(204);
    },
  );

  // Same contract the editor's "Export > Shareable link" expects, so it works
  // unchanged.
  router.post(
    "/v2/post",
    rawBody(config.maxShareLinkBytes),
    async (req, res) => {
      if (!hasBody(req)) {
        res.status(400).json({ error_class: "BadRequestError" });
        return;
      }
      res.json({ id: await createShareLink(req.body) });
    },
  );

  router.get("/v2/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      res.sendStatus(400);
      return;
    }
    const data = await getShareLink(req.params.id);
    if (!data) {
      res.sendStatus(404);
      return;
    }
    sendBinary(res, data);
  });

  return router;
};
