import { newElementWith } from "@sketchsync/element";
import { API } from "@sketchsync/editor/tests/helpers/api";

import type { SketchSyncElement } from "@sketchsync/element/types";

import {
  collectLabels,
  diffBoard,
  guessActor,
  presenceSnapshot,
  summarizeBoardChanges,
  summarizePresence,
  takeVersionSnapshot,
} from "../components/boardActivity";

const notOwn = () => false;

const deleted = (element: SketchSyncElement) =>
  newElementWith(element, { isDeleted: true });

const describeDiff = (
  before: readonly SketchSyncElement[],
  after: readonly SketchSyncElement[],
  actor = "Ada",
  isOwnChange: (element: SketchSyncElement) => boolean = notOwn,
) => {
  const { changes } = diffBoard(
    takeVersionSnapshot(before),
    after,
    isOwnChange,
  );
  return summarizeBoardChanges(changes, actor, collectLabels(after));
};

describe("board activity", () => {
  it("announces added items by type", () => {
    const first = API.createElement({});
    const second = API.createElement({});
    expect(describeDiff([], [first, second])).toBe("Ada added 2 rectangles.");
  });

  it("announces a single removed item with its text", () => {
    const note = API.createElement({ type: "stickynote", id: "note" });
    const label = API.createElement({
      type: "text",
      text: "Exam on Friday",
      containerId: "note",
    });
    const before = [
      { ...note, boundElements: [{ id: label.id, type: "text" as const }] },
      label,
    ];
    const after = before.map(deleted);
    expect(describeDiff(before, after, "Ben")).toBe(
      "Ben removed a sticky note 'Exam on Friday'.",
    );
  });

  it("treats a label edit as a change to its container", () => {
    const box = API.createElement({ id: "box" });
    const label = API.createElement({
      type: "text",
      text: "Login",
      containerId: "box",
    });
    const edited = newElementWith(label, {
      text: "Sign in",
      originalText: "Sign in",
    });
    expect(describeDiff([box, label], [box, edited])).toBe(
      "Ada changed a rectangle 'Sign in'.",
    );
  });

  it("mixes kinds of change in one sentence", () => {
    const kept = API.createElement({ id: "kept" });
    const removed = API.createElement({ type: "ellipse", id: "removed" });
    const added = API.createElement({ type: "arrow", id: "added" });
    const after = [newElementWith(kept, { x: 50 }), deleted(removed), added];
    expect(describeDiff([kept, removed], after)).toBe(
      "Ada added an arrow, removed an ellipse and changed a rectangle.",
    );
  });

  it("ignores the user's own edits", () => {
    const mine = API.createElement({ id: "mine" });
    const theirs = API.createElement({ type: "diamond", id: "theirs" });
    expect(
      describeDiff(
        [],
        [mine, theirs],
        "Ada",
        (element) => element.id === "mine",
      ),
    ).toBe("Ada added a diamond.");
    expect(
      describeDiff([], [mine], "Ada", (element) => element.id === "mine"),
    ).toBeNull();
  });

  it("says nothing when nothing changed", () => {
    const element = API.createElement({});
    expect(describeDiff([element], [element])).toBeNull();
  });
});

describe("collaborator presence", () => {
  it("announces people joining and leaving, but not the current user", () => {
    const before = presenceSnapshot(
      new Map([
        ["me", { username: "Me", isCurrentUser: true }],
        ["ben", { username: "Ben" }],
      ]),
    );
    const after = presenceSnapshot(
      new Map([
        ["me", { username: "Me", isCurrentUser: true }],
        ["ada", { username: "Ada" }],
        ["cy", { username: "" }],
      ]),
    );
    expect(summarizePresence(before, after)).toBe(
      "Ada and Someone joined the board. Ben left the board.",
    );
    expect(summarizePresence(after, after)).toBeNull();
  });

  it("guesses who made a change", () => {
    const element = API.createElement({ id: "shape" });
    const changes = { added: [element], removed: [], changed: [] };
    expect(
      guessActor(
        changes,
        new Map([
          [
            "a",
            { username: "Ada", selectedElementIds: { shape: true as const } },
          ],
          ["b", { username: "Ben" }],
        ]),
      ),
    ).toBe("Ada");
    expect(guessActor(changes, new Map([["b", { username: "Ben" }]]))).toBe(
      "Ben",
    );
    expect(
      guessActor(
        changes,
        new Map([
          ["a", { username: "Ada" }],
          ["b", { username: "Ben" }],
        ]),
      ),
    ).toBe("Someone");
  });
});
