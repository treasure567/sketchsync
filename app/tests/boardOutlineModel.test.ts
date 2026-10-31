import { API } from "@sketchsync/editor/tests/helpers/api";

import type {
  SketchSyncElement,
  FixedPointBinding,
} from "@sketchsync/element/types";

import {
  buildOutline,
  colourName,
  deleteFromBoard,
  describeNode,
  flattenOutline,
  positionInWords,
  sortInReadingOrder,
} from "../components/boardOutlineModel";

const bindingTo = (elementId: string) =>
  ({ elementId, fixedPoint: [0.5, 0.5], mode: "orbit" } as FixedPointBinding);

const labelled = (
  container: SketchSyncElement,
  text: string,
): [SketchSyncElement, SketchSyncElement] => {
  const label = API.createElement({
    type: "text",
    text,
    containerId: container.id,
    x: container.x + 10,
    y: container.y + 10,
  });
  return [
    { ...container, boundElements: [{ id: label.id, type: "text" }] },
    label,
  ];
};

const titles = (elements: readonly SketchSyncElement[]) => {
  const tree = buildOutline(elements);
  return flattenOutline(tree.roots, new Set()).map(
    (row) => describeNode(row.node, tree).title,
  );
};

describe("board outline reading order", () => {
  it("reads rows top to bottom, then left to right", () => {
    const right = API.createElement({ id: "right", x: 300, y: 0 });
    const left = API.createElement({ id: "left", x: 0, y: 10 });
    const below = API.createElement({ id: "below", x: 0, y: 220 });
    const order = sortInReadingOrder(
      [below, right, left].map((element) => ({
        id: element.id,
        bounds: [
          element.x,
          element.y,
          element.x + element.width,
          element.y + element.height,
        ] as const,
      })),
    ).map((item) => item.id);
    expect(order).toEqual(["left", "right", "below"]);
  });

  it("orders the outline the same way", () => {
    const [login, loginLabel] = labelled(
      API.createElement({ x: 400, y: 0 }),
      "Login",
    );
    const [home, homeLabel] = labelled(
      API.createElement({ x: 0, y: 20 }),
      "Home",
    );
    expect(titles([login, loginLabel, home, homeLabel])).toEqual([
      "Rectangle with text 'Home'",
      "Rectangle with text 'Login'",
    ]);
  });
});

describe("board outline descriptions", () => {
  it("folds bound text into its container", () => {
    const [box, label] = labelled(API.createElement({}), "Login");
    const tree = buildOutline([box, label]);
    expect(tree.itemCount).toBe(1);
    expect(titles([box, label])).toEqual(["Rectangle with text 'Login'"]);
  });

  it("describes arrows by what they connect", () => {
    const [login, loginLabel] = labelled(
      API.createElement({ id: "login", x: 0, y: 0 }),
      "Login",
    );
    const [dashboard, dashboardLabel] = labelled(
      API.createElement({ id: "dashboard", x: 400, y: 0 }),
      "Dashboard",
    );
    const arrow = API.createElement({
      type: "arrow",
      id: "arrow",
      x: 100,
      y: 50,
      width: 300,
      height: 0,
      startBinding: bindingTo("login"),
      endBinding: bindingTo("dashboard"),
    });
    const elements = [
      {
        ...login,
        boundElements: [
          ...login.boundElements!,
          { id: "arrow", type: "arrow" as const },
        ],
      },
      loginLabel,
      {
        ...dashboard,
        boundElements: [
          ...dashboard.boundElements!,
          { id: "arrow", type: "arrow" as const },
        ],
      },
      dashboardLabel,
      arrow,
    ];
    const tree = buildOutline(elements);
    expect(describeNode(tree.nodesByKey.get("arrow")!, tree).title).toBe(
      "Arrow from 'Login' to 'Dashboard'",
    );
    const loginDescription = describeNode(tree.nodesByKey.get("login")!, tree);
    expect(loginDescription.details).toContain("arrow to 'Dashboard'");
    expect(loginDescription.spoken).toContain("arrow to 'Dashboard'");
    expect(
      describeNode(tree.nodesByKey.get("dashboard")!, tree).details,
    ).toContain("arrow from 'Login'");
  });

  it("says where an unconnected arrow points", () => {
    const arrow = API.createElement({
      type: "arrow",
      points: [
        [0, 0],
        [0, 120],
      ] as any,
    });
    expect(titles([arrow])).toEqual(["Arrow pointing down"]);
  });

  it("names the other element types in plain words", () => {
    const [note, noteLabel] = labelled(
      API.createElement({ type: "stickynote", x: 0, y: 0 }),
      "Exam on Friday",
    );
    const drawing = API.createElement({
      type: "freedraw",
      x: 0,
      y: 400,
      points: [
        [0, 0],
        [20, 30],
      ] as any,
    });
    const image = API.createElement({ type: "image", x: 0, y: 800 });
    const text = API.createElement({
      type: "text",
      text: "Hello",
      x: 0,
      y: 1200,
    });
    expect(titles([note, noteLabel, drawing, image, text])).toEqual([
      "Sticky note 'Exam on Friday'",
      "Freehand drawing",
      "Image",
      "Text 'Hello'",
    ]);
  });

  it("gives rough position, size and custom colours", () => {
    const topLeft = API.createElement({
      id: "top-left",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      strokeColor: "#1971c2",
      backgroundColor: "#ffec99",
    });
    const bottomRight = API.createElement({ x: 900, y: 900 });
    const tree = buildOutline([topLeft, bottomRight]);
    const description = describeNode(tree.nodesByKey.get("top-left")!, tree);
    expect(description.details).toBe(
      "top left · 200 × 100 · blue outline, light yellow fill",
    );
    expect(description.spoken).toBe(
      "Rectangle, top left of the board, 200 by 100, blue outline, light yellow fill",
    );
  });

  it("shortens long text", () => {
    const text = API.createElement({
      type: "text",
      text: "word ".repeat(40),
    });
    const [title] = titles([text]);
    expect(title.length).toBeLessThan(80);
    expect(title.endsWith("…'")).toBe(true);
  });
});

describe("board outline structure", () => {
  it("nests frame children under their frame", () => {
    const frame = API.createElement({
      type: "frame",
      id: "frame",
      x: 0,
      y: 0,
      width: 600,
      height: 600,
    });
    const first = API.createElement({
      id: "a",
      x: 20,
      y: 20,
      frameId: "frame",
    });
    const second = API.createElement({
      id: "b",
      x: 400,
      y: 400,
      frameId: "frame",
    });
    const outside = API.createElement({ id: "c", x: 1000, y: 0 });
    const tree = buildOutline([frame, first, second, outside]);

    const expanded = flattenOutline(tree.roots, new Set());
    expect(
      expanded.map((row) => [
        row.node.key,
        row.level,
        row.posInSet,
        row.setSize,
      ]),
    ).toEqual([
      ["frame", 1, 1, 2],
      ["a", 2, 1, 2],
      ["b", 2, 2, 2],
      ["c", 1, 2, 2],
    ]);
    expect(describeNode(tree.nodesByKey.get("a")!, tree).spoken).toContain(
      "top left of the frame",
    );
    expect(describeNode(tree.nodesByKey.get("frame")!, tree).details).toContain(
      "2 items",
    );

    const collapsed = flattenOutline(tree.roots, new Set(["frame"]));
    expect(collapsed.map((row) => row.node.key)).toEqual(["frame", "c"]);
  });

  it("groups grouped elements", () => {
    const one = API.createElement({ id: "one", x: 0, groupIds: ["g"] });
    const two = API.createElement({ id: "two", x: 200, groupIds: ["g"] });
    const tree = buildOutline([one, two]);
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].memberIds).toEqual(["one", "two"]);
    expect(describeNode(tree.roots[0], tree).title).toBe("Group of 2 items");
  });

  it("skips deleted elements", () => {
    const kept = API.createElement({ id: "kept" });
    const deleted = API.createElement({ id: "gone", isDeleted: true });
    expect(buildOutline([kept, deleted]).itemCount).toBe(1);
  });

  it("stays fast with 10,000 elements", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      API.createElement({
        x: (index % 100) * 150,
        y: Math.floor(index / 100) * 150,
      }),
    );
    const start = performance.now();
    const tree = buildOutline(elements);
    const rows = flattenOutline(tree.roots, new Set());
    const elapsed = performance.now() - start;
    expect(rows).toHaveLength(10_000);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("words for position and colour", () => {
  it("describes the nine areas", () => {
    const board = [0, 0, 300, 300] as const;
    expect(positionInWords([0, 0, 10, 10], board)).toBe("top left");
    expect(positionInWords([140, 0, 160, 10], board)).toBe("top");
    expect(positionInWords([140, 140, 160, 160], board)).toBe("centre");
    expect(positionInWords([290, 140, 300, 160], board)).toBe("right");
    expect(positionInWords([290, 290, 300, 300], board)).toBe("bottom right");
  });

  it("names palette and custom colours", () => {
    expect(colourName("transparent")).toBeNull();
    expect(colourName("#e03131")).toBe("red");
    expect(colourName("#a5d8ff")).toBe("light blue");
    expect(colourName("#ffffff")).toBe("white");
    expect(colourName("#123")).toBe("dark blue");
    expect(colourName("#00ff00")).toBe("green");
    expect(colourName("not a colour")).toBeNull();
  });
});

describe("deleting from the outline", () => {
  it("removes the item with its label and unbinds arrows", () => {
    const [box, label] = labelled(API.createElement({ id: "box" }), "Login");
    const arrow = API.createElement({
      type: "arrow",
      id: "arrow",
      startBinding: bindingTo("box"),
    });
    const boxWithArrow = {
      ...box,
      boundElements: [
        ...box.boundElements!,
        { id: "arrow", type: "arrow" as const },
      ],
    };
    const next = deleteFromBoard([boxWithArrow, label, arrow], ["box"]);
    const byId = new Map(next.map((element) => [element.id, element]));
    expect(byId.get("box")!.isDeleted).toBe(true);
    expect(byId.get(label.id)!.isDeleted).toBe(true);
    expect(byId.get("arrow")!.isDeleted).toBe(false);
    expect((byId.get("arrow") as any).startBinding).toBeNull();
  });

  it("keeps frame children when deleting a frame", () => {
    const frame = API.createElement({ type: "frame", id: "frame" });
    const child = API.createElement({ id: "child", frameId: "frame" });
    const next = deleteFromBoard([frame, child], ["frame"]);
    expect(next[0].isDeleted).toBe(true);
    expect(next[1].isDeleted).toBe(false);
    expect(next[1].frameId).toBeNull();
  });

  it("removes a deleted arrow from the shapes it was bound to", () => {
    const box = API.createElement({
      id: "box",
      boundElements: [{ id: "arrow", type: "arrow" }],
    });
    const arrow = API.createElement({
      type: "arrow",
      id: "arrow",
      startBinding: bindingTo("box"),
    });
    const [nextBox] = deleteFromBoard([box, arrow], ["arrow"]);
    expect(nextBox.boundElements).toEqual([]);
  });
});
