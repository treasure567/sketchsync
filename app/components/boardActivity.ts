import type {
  SketchSyncElement,
  SketchSyncTextElement,
} from "@sketchsync/element/types";

import { kindName, pluralKindName, quoteText } from "./boardOutlineModel";

export type VersionSnapshot = ReadonlyMap<string, number>;

export type BoardChanges = {
  added: readonly SketchSyncElement[];
  removed: readonly (SketchSyncElement | null)[];
  changed: readonly SketchSyncElement[];
};

export type CollaboratorLike = {
  username?: string | null;
  isCurrentUser?: boolean;
  selectedElementIds?: Readonly<Record<string, true>>;
};

export const takeVersionSnapshot = (
  elements: readonly SketchSyncElement[],
): Map<string, number> => {
  const snapshot = new Map<string, number>();
  for (const element of elements) {
    if (!element.isDeleted) {
      snapshot.set(element.id, element.version);
    }
  }
  return snapshot;
};

export const hasChanges = (changes: BoardChanges) =>
  changes.added.length + changes.removed.length + changes.changed.length > 0;

export const diffBoard = (
  previous: VersionSnapshot,
  elements: readonly SketchSyncElement[],
  isOwnChange: (element: SketchSyncElement) => boolean,
): { changes: BoardChanges; snapshot: Map<string, number> } => {
  const snapshot = takeVersionSnapshot(elements);
  const elementsById = new Map(
    elements.map((element) => [element.id, element]),
  );

  const added = new Map<string, SketchSyncElement>();
  const changed = new Map<string, SketchSyncElement>();
  const removed = new Map<string, SketchSyncElement | null>();

  for (const element of elements) {
    if (element.isDeleted || isOwnChange(element)) {
      continue;
    }
    const previousVersion = previous.get(element.id);
    if (previousVersion === undefined) {
      added.set(element.id, element);
    } else if (previousVersion !== element.version) {
      changed.set(element.id, element);
    }
  }
  for (const id of previous.keys()) {
    if (snapshot.has(id)) {
      continue;
    }
    const element = elementsById.get(id) ?? null;
    if (!element || !isOwnChange(element)) {
      removed.set(id, element);
    }
  }

  const getLiveContainer = (element: SketchSyncElement | null) => {
    if (element?.type !== "text" || !element.containerId) {
      return null;
    }
    const container = elementsById.get(element.containerId);
    return container && !container.isDeleted ? container : null;
  };
  const isLabel = (element: SketchSyncElement | null) =>
    element?.type === "text" && !!element.containerId;

  for (const [id, element] of [...added, ...changed, ...removed]) {
    if (!isLabel(element)) {
      continue;
    }
    added.delete(id);
    changed.delete(id);
    removed.delete(id);
    const container = getLiveContainer(element);
    if (container && !added.has(container.id)) {
      changed.set(container.id, container);
    }
  }

  return {
    changes: {
      added: [...added.values()],
      removed: [...removed.values()],
      changed: [...changed.values()],
    },
    snapshot,
  };
};

export const collectLabels = (elements: readonly SketchSyncElement[]) => {
  const labels = new Map<string, SketchSyncTextElement>();
  for (const element of elements) {
    if (element.type !== "text" || !element.containerId) {
      continue;
    }
    const existing = labels.get(element.containerId);
    if (!existing || existing.isDeleted) {
      labels.set(element.containerId, element);
    }
  }
  return labels;
};

const withArticle = (phrase: string) =>
  `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;

export const joinWithAnd = (parts: readonly string[]) =>
  parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
    : parts[0] ?? "";

const describeSingleItem = (
  element: SketchSyncElement,
  labels: ReadonlyMap<string, SketchSyncTextElement>,
) => {
  const label = labels.get(element.id);
  const text =
    element.type === "text"
      ? element.originalText || element.text
      : label?.originalText || label?.text || "";
  const kind = kindName(element).toLowerCase();
  if (element.type === "text") {
    return text.trim() ? `text ${quoteText(text)}` : "a text";
  }
  return text.trim()
    ? `${withArticle(kind)} ${quoteText(text)}`
    : withArticle(kind);
};

export const describeItems = (
  elements: readonly (SketchSyncElement | null)[],
  labels: ReadonlyMap<string, SketchSyncTextElement>,
) => {
  if (elements.length === 1 && elements[0]) {
    return describeSingleItem(elements[0], labels);
  }
  const types = new Set(elements.map((element) => element?.type ?? null));
  const [onlyType] = types;
  return types.size === 1 && onlyType
    ? `${elements.length} ${pluralKindName(onlyType)}`
    : `${elements.length} items`;
};

export const summarizeBoardChanges = (
  changes: BoardChanges,
  actor: string,
  labels: ReadonlyMap<string, SketchSyncTextElement>,
) => {
  const parts: string[] = [];
  if (changes.added.length) {
    parts.push(`added ${describeItems(changes.added, labels)}`);
  }
  if (changes.removed.length) {
    parts.push(`removed ${describeItems(changes.removed, labels)}`);
  }
  if (changes.changed.length) {
    parts.push(`changed ${describeItems(changes.changed, labels)}`);
  }
  return parts.length ? `${actor} ${joinWithAnd(parts)}.` : null;
};

const displayName = (collaborator: CollaboratorLike) =>
  collaborator.username?.trim() || "Someone";

export const presenceSnapshot = (
  collaborators: ReadonlyMap<string, CollaboratorLike>,
) => {
  const present = new Map<string, string>();
  for (const [id, collaborator] of collaborators) {
    if (!collaborator.isCurrentUser) {
      present.set(id, displayName(collaborator));
    }
  }
  return present;
};

export const summarizePresence = (
  previous: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>,
) => {
  const joined = [...next]
    .filter(([id]) => !previous.has(id))
    .map(([, name]) => name);
  const left = [...previous]
    .filter(([id]) => !next.has(id))
    .map(([, name]) => name);
  const sentences = [];
  if (joined.length) {
    sentences.push(`${joinWithAnd(joined)} joined the board.`);
  }
  if (left.length) {
    sentences.push(`${joinWithAnd(left)} left the board.`);
  }
  return sentences.length ? sentences.join(" ") : null;
};

export const guessActor = (
  changes: BoardChanges,
  collaborators: ReadonlyMap<string, CollaboratorLike>,
) => {
  const others = [...collaborators.values()].filter(
    (collaborator) => !collaborator.isCurrentUser,
  );
  const touchedIds = [...changes.added, ...changes.changed].map(
    (element) => element.id,
  );
  const selectors = others.filter((collaborator) =>
    touchedIds.some((id) => collaborator.selectedElementIds?.[id]),
  );
  if (selectors.length === 1) {
    return displayName(selectors[0]);
  }
  if (others.length === 1) {
    return displayName(others[0]);
  }
  return "Someone";
};
