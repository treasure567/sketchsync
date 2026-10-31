import { randomInt } from "node:crypto";

export type SceneElement = {
  id: string;
  version: number;
  versionNonce: number;
  type: string;
  isDeleted?: boolean;
  index?: string | null;
  updated?: number;
  [key: string]: unknown;
};

const MAX_ELEMENT_ID_LENGTH = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isSceneElement = (value: unknown): value is SceneElement => {
  const element = value as SceneElement | null;
  return (
    typeof element === "object" &&
    element !== null &&
    !Array.isArray(element) &&
    typeof element.id === "string" &&
    element.id.length > 0 &&
    element.id.length <= MAX_ELEMENT_ID_LENGTH &&
    Number.isSafeInteger(element.version) &&
    Number.isFinite(element.versionNonce) &&
    typeof element.type === "string"
  );
};

// Must match the client's `shouldDiscardRemoteElement` exactly, otherwise the
// server and the clients could settle on different winners.
export const isNewer = (candidate: SceneElement, current: SceneElement) =>
  candidate.version > current.version ||
  (candidate.version === current.version &&
    candidate.versionNonce < current.versionNonce);

export const mergeElements = (
  target: Map<string, SceneElement>,
  incoming: Iterable<SceneElement>,
) => {
  const accepted: SceneElement[] = [];
  for (const element of incoming) {
    const current = target.get(element.id);
    if (!current || isNewer(element, current)) {
      target.set(element.id, element);
      accepted.push(element);
    }
  }
  return accepted;
};

const byFractionalIndex = (a: SceneElement, b: SceneElement) => {
  const aIndex = a.index ?? "";
  const bIndex = b.index ?? "";
  if (aIndex !== bIndex) {
    return aIndex < bIndex ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

export const orderedElements = (elements: Iterable<SceneElement>) =>
  [...elements].sort(byFractionalIndex);

export const liveElements = (elements: Iterable<SceneElement>) =>
  orderedElements([...elements].filter((element) => !element.isDeleted));

// A deleted element must outlive any client that could still hold the live
// copy, or that client would bring it back when it reconnects.
export const withoutOldTombstones = (
  elements: Iterable<SceneElement>,
  retentionDays: number,
  now = Date.now(),
) => {
  const cutoff = now - retentionDays * DAY_MS;
  return [...elements].filter(
    (element) =>
      !element.isDeleted ||
      typeof element.updated !== "number" ||
      element.updated > cutoff,
  );
};

export const newVersionNonce = () => randomInt(0, 2 ** 31 - 1);
