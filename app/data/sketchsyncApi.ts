import type { OrderedSketchSyncElement } from "@sketchsync/element/types";

import { atom } from "../app-jotai";

export type Role = "owner" | "editor" | "viewer";
export type MemberRole = Exclude<Role, "owner">;

export type User = { id: string; email: string; name: string };

export type BoardInfo = {
  id: string;
  title: string;
  role: Role;
  fileKey: string;
  ownerName: string;
  linkExpiresAt: string | null;
};

export type BoardSummary = {
  id: string;
  title: string;
  role: Role;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export type InviteLink = {
  token: string;
  role: MemberRole;
  expiresAt: string | null;
  createdAt: string;
};

export type VersionSummary = {
  id: string;
  label: string | null;
  kind: "auto" | "manual" | "before-restore";
  elementCount: number;
  createdAt: string;
  createdByName: string | null;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const isNetworkError = (error: unknown) => !(error instanceof ApiError);

const API_URL = (import.meta.env.VITE_APP_STORAGE_URL || "/api").replace(
  /\/$/,
  "",
);

let boardInvite: string | null = null;

export const setBoardInvite = (token: string | null) => {
  boardInvite = token;
};

export const getBoardInvite = () => boardInvite;

export const boardRequestHeaders = (): Record<string, string> =>
  boardInvite ? { "X-Board-Invite": boardInvite } : {};

const request = async <T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...boardRequestHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload?.error ?? "request_failed");
  }
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
};

const boardPath = (boardId: string, rest = "") =>
  `/boards/${encodeURIComponent(boardId)}${rest}`;

export const api = {
  me: () => request<{ user: User | null }>("/auth/me").then((r) => r.user),
  signIn: (email: string, password: string) =>
    request<{ user: User }>("/auth/signin", {
      method: "POST",
      body: { email, password },
    }).then((r) => r.user),
  signUp: (name: string, email: string, password: string) =>
    request<{ user: User }>("/auth/signup", {
      method: "POST",
      body: { name, email, password },
    }).then((r) => r.user),
  signOut: () => request<void>("/auth/signout", { method: "POST" }),
  updateProfile: (name: string) =>
    request<{ user: User }>("/auth/me", {
      method: "PATCH",
      body: { name },
    }).then((r) => r.user),

  listBoards: () =>
    request<{ boards: BoardSummary[] }>("/boards").then((r) => r.boards),
  createBoard: (title: string, elements: readonly OrderedSketchSyncElement[]) =>
    request<{ board: BoardInfo }>("/boards", {
      method: "POST",
      body: { title, elements },
    }).then((r) => r.board),
  getBoard: (boardId: string) =>
    request<{ board: BoardInfo }>(boardPath(boardId)).then((r) => r.board),
  renameBoard: (boardId: string, title: string) =>
    request<void>(boardPath(boardId), { method: "PATCH", body: { title } }),
  deleteBoard: (boardId: string) =>
    request<void>(boardPath(boardId), { method: "DELETE" }),
  getScene: (boardId: string) =>
    request<{ elements: OrderedSketchSyncElement[] }>(
      boardPath(boardId, "/scene"),
    ).then((r) => r.elements),

  listMembers: (boardId: string) =>
    request<{ members: Member[] }>(boardPath(boardId, "/members")).then(
      (r) => r.members,
    ),
  addMember: (boardId: string, email: string, role: MemberRole) =>
    request<{ members: Member[] }>(boardPath(boardId, "/members"), {
      method: "POST",
      body: { email, role },
    }).then((r) => r.members),
  setMemberRole: (boardId: string, userId: string, role: MemberRole) =>
    request<{ members: Member[] }>(boardPath(boardId, `/members/${userId}`), {
      method: "PATCH",
      body: { role },
    }).then((r) => r.members),
  removeMember: (boardId: string, userId: string) =>
    request<void>(boardPath(boardId, `/members/${userId}`), {
      method: "DELETE",
    }),

  listLinks: (boardId: string) =>
    request<{ links: InviteLink[] }>(boardPath(boardId, "/links")).then(
      (r) => r.links,
    ),
  createLink: (
    boardId: string,
    role: MemberRole,
    expiresInMinutes: number | null,
  ) =>
    request<{ link: InviteLink }>(boardPath(boardId, "/links"), {
      method: "POST",
      body: { role, expiresInMinutes },
    }).then((r) => r.link),
  revokeLink: (boardId: string, token: string) =>
    request<void>(boardPath(boardId, `/links/${token}`), {
      method: "DELETE",
    }),

  listVersions: (boardId: string) =>
    request<{ versions: VersionSummary[] }>(
      boardPath(boardId, "/versions"),
    ).then((r) => r.versions),
  getVersion: (boardId: string, versionId: string) =>
    request<{ elements: OrderedSketchSyncElement[] }>(
      boardPath(boardId, `/versions/${versionId}`),
    ).then((r) => r.elements),
  saveVersion: (boardId: string, label: string | null) =>
    request<{ version: { id: string } }>(boardPath(boardId, "/versions"), {
      method: "POST",
      body: { label },
    }),
  restoreVersion: (boardId: string, versionId: string) =>
    request<{ changedElements: number }>(
      boardPath(boardId, `/versions/${versionId}/restore`),
      { method: "POST" },
    ),
};

const ERROR_MESSAGES: Record<string, string> = {
  sign_in_required: "Sign in to open this board.",
  forbidden:
    "You don't have access to this board. Ask its owner to invite you.",
  link_expired: "This invite link has expired or was turned off.",
  not_found: "This board doesn't exist, or it was deleted.",
  email_taken: "An account with this email already exists. Try signing in.",
  invalid_credentials: "That email and password don't match.",
  invalid_input: "Please check the details and try again.",
  no_account:
    "No SketchSync account uses that email yet. Ask them to sign up first.",
  already_owner: "You already own this board.",
  too_many_requests: "Too many attempts. Wait a few minutes and try again.",
  read_only: "You can view this board but not edit it.",
};

export const describeError = (error: unknown) => {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? "Something went wrong. Try again.";
  }
  return "Can't reach the SketchSync server. Check your connection.";
};

export const currentUserAtom = atom<User | null | undefined>(undefined);
export const currentBoardAtom = atom<BoardInfo | null>(null);
