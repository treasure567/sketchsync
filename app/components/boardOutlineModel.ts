import { COLOR_PALETTE, DEFAULT_ELEMENT_PROPS } from "@sketchsync/common";
import { newElementWith } from "@sketchsync/element";

import type {
  SketchSyncElement,
  SketchSyncTextElement,
  NonDeletedSketchSyncElement,
} from "@sketchsync/element/types";

export type Bounds = readonly [
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
];

export type OutlineNode = {
  key: string;
  element: NonDeletedSketchSyncElement | null;
  memberIds: readonly string[];
  children: readonly OutlineNode[];
  bounds: Bounds;
  frameKey: string | null;
};

export type OutlineTree = {
  roots: readonly OutlineNode[];
  boardBounds: Bounds;
  elementsById: ReadonlyMap<string, NonDeletedSketchSyncElement>;
  labelsByContainerId: ReadonlyMap<string, SketchSyncTextElement>;
  nodesByKey: ReadonlyMap<string, OutlineNode>;
  itemCount: number;
};

export type OutlineRow = {
  node: OutlineNode;
  level: number;
  posInSet: number;
  setSize: number;
  parentKey: string | null;
};

export type OutlineDescription = {
  title: string;
  details: string;
  spoken: string;
};

const MIN_ROW_BAND = 8;
const MAX_ROW_BAND = 300;
const MAX_QUOTED_TEXT = 60;
const MAX_LISTED_CONNECTIONS = 3;

const EMPTY_BOUNDS: Bounds = [0, 0, 0, 0];

const isFrameLike = (element: SketchSyncElement) =>
  element.type === "frame" || element.type === "magicframe";

const hasPoints = (
  element: SketchSyncElement,
): element is SketchSyncElement & {
  points: readonly (readonly [number, number])[];
} => "points" in element && Array.isArray(element.points);

export const getApproximateBounds = (element: SketchSyncElement): Bounds => {
  if (hasPoints(element) && element.points.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [px, py] of element.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return [
      element.x + minX,
      element.y + minY,
      element.x + maxX,
      element.y + maxY,
    ];
  }

  const { x, y, width, height, angle } = element;
  if (!angle) {
    return [x, y, x + width, y + height];
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfWidth = (width * cos + height * sin) / 2;
  const halfHeight = (width * sin + height * cos) / 2;
  return [cx - halfWidth, cy - halfHeight, cx + halfWidth, cy + halfHeight];
};

const unionBounds = (boundsList: readonly Bounds[]): Bounds => {
  if (!boundsList.length) {
    return EMPTY_BOUNDS;
  }
  let [minX, minY, maxX, maxY] = boundsList[0];
  for (const [x1, y1, x2, y2] of boundsList) {
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }
  return [minX, minY, maxX, maxY];
};

export const sortInReadingOrder = <T extends { bounds: Bounds }>(
  items: readonly T[],
): T[] => {
  const byTop = [...items].sort(
    (a, b) => a.bounds[1] - b.bounds[1] || a.bounds[0] - b.bounds[0],
  );
  const ordered: T[] = [];
  let row: T[] = [];
  let rowBottom = -Infinity;

  const flushRow = () => {
    row.sort((a, b) => a.bounds[0] - b.bounds[0]);
    ordered.push(...row);
    row = [];
  };

  for (const item of byTop) {
    const [, top, , bottom] = item.bounds;
    const centerY = (top + bottom) / 2;
    if (row.length && centerY > rowBottom) {
      flushRow();
    }
    if (!row.length) {
      const height = bottom - top;
      rowBottom = top + Math.max(MIN_ROW_BAND, Math.min(height, MAX_ROW_BAND));
    }
    row.push(item);
  }
  flushRow();
  return ordered;
};

const getNextGroupId = (
  element: SketchSyncElement,
  enclosingGroupIds: ReadonlySet<string>,
) => {
  for (let index = element.groupIds.length - 1; index >= 0; index--) {
    const groupId = element.groupIds[index];
    if (!enclosingGroupIds.has(groupId)) {
      return groupId;
    }
  }
  return null;
};

export const buildOutline = (
  sceneElements: readonly SketchSyncElement[],
): OutlineTree => {
  const elementsById = new Map<string, NonDeletedSketchSyncElement>();
  for (const element of sceneElements) {
    if (!element.isDeleted && element.type !== "selection") {
      elementsById.set(element.id, element as NonDeletedSketchSyncElement);
    }
  }

  const labelsByContainerId = new Map<string, SketchSyncTextElement>();
  for (const element of elementsById.values()) {
    if (
      element.type === "text" &&
      element.containerId &&
      elementsById.has(element.containerId)
    ) {
      labelsByContainerId.set(element.containerId, element);
    }
  }

  const items: NonDeletedSketchSyncElement[] = [];
  for (const element of elementsById.values()) {
    const isLabel =
      element.type === "text" && labelsByContainerId.get(element.containerId!);
    if (!isLabel) {
      items.push(element);
    }
  }

  const frameIds = new Set(items.filter(isFrameLike).map((frame) => frame.id));
  const childrenByFrameId = new Map<string, NonDeletedSketchSyncElement[]>();
  const topLevel: NonDeletedSketchSyncElement[] = [];
  for (const element of items) {
    if (element.frameId && frameIds.has(element.frameId)) {
      const siblings = childrenByFrameId.get(element.frameId) ?? [];
      siblings.push(element);
      childrenByFrameId.set(element.frameId, siblings);
    } else {
      topLevel.push(element);
    }
  }

  const nodesByKey = new Map<string, OutlineNode>();

  const register = (node: OutlineNode) => {
    nodesByKey.set(node.key, node);
    return node;
  };

  const buildScope = (
    members: readonly NonDeletedSketchSyncElement[],
    enclosingGroupIds: ReadonlySet<string>,
    frameKey: string | null,
  ): OutlineNode[] => {
    const nodes: OutlineNode[] = [];
    const membersByGroupId = new Map<string, NonDeletedSketchSyncElement[]>();

    for (const element of members) {
      const groupId = getNextGroupId(element, enclosingGroupIds);
      if (groupId) {
        const groupMembers = membersByGroupId.get(groupId) ?? [];
        groupMembers.push(element);
        membersByGroupId.set(groupId, groupMembers);
      } else {
        nodes.push(buildElementNode(element, frameKey));
      }
    }

    for (const [groupId, groupMembers] of membersByGroupId) {
      const innerGroupIds = new Set(enclosingGroupIds).add(groupId);
      const children = buildScope(groupMembers, innerGroupIds, frameKey);
      if (children.length === 1) {
        nodes.push(children[0]);
        continue;
      }
      nodes.push(
        register({
          key: `group:${groupId}:${frameKey ?? "board"}`,
          element: null,
          memberIds: children.flatMap((child) => child.memberIds),
          children,
          bounds: unionBounds(children.map((child) => child.bounds)),
          frameKey,
        }),
      );
    }

    return sortInReadingOrder(nodes);
  };

  const buildElementNode = (
    element: NonDeletedSketchSyncElement,
    frameKey: string | null,
  ): OutlineNode => {
    const frameChildren = childrenByFrameId.get(element.id);
    return register({
      key: element.id,
      element,
      memberIds: [element.id],
      children: frameChildren
        ? buildScope(frameChildren, new Set(), element.id)
        : [],
      bounds: getApproximateBounds(element),
      frameKey,
    });
  };

  const roots = buildScope(topLevel, new Set(), null);

  return {
    roots,
    boardBounds: unionBounds(roots.map((node) => node.bounds)),
    elementsById,
    labelsByContainerId,
    nodesByKey,
    itemCount: items.length,
  };
};

export const flattenOutline = (
  roots: readonly OutlineNode[],
  collapsedKeys: ReadonlySet<string>,
): OutlineRow[] => {
  const rows: OutlineRow[] = [];
  const visit = (
    nodes: readonly OutlineNode[],
    level: number,
    parentKey: string | null,
  ) => {
    nodes.forEach((node, index) => {
      rows.push({
        node,
        level,
        posInSet: index + 1,
        setSize: nodes.length,
        parentKey,
      });
      if (node.children.length && !collapsedKeys.has(node.key)) {
        visit(node.children, level + 1, node.key);
      }
    });
  };
  visit(roots, 1, null);
  return rows;
};

const PALETTE_SHADE_WORDS = ["very light", "light", "", "", ""];
const PALETTE_HUE_NAMES: Record<string, string> = {
  gray: "grey",
  grape: "purple",
  bronze: "brown",
};

const paletteColourNames = (() => {
  const names = new Map<string, string>();
  for (const [key, value] of Object.entries(COLOR_PALETTE)) {
    const hueName = PALETTE_HUE_NAMES[key] ?? key;
    if (typeof value === "string") {
      names.set(value.toLowerCase(), hueName);
      continue;
    }
    value.forEach((shade, index) => {
      names.set(
        shade.toLowerCase(),
        [PALETTE_SHADE_WORDS[index], hueName].filter(Boolean).join(" "),
      );
    });
  }
  return names;
})();

const parseHex = (colour: string) => {
  const match = /^#([0-9a-f]{3,8})$/i.exec(colour.trim());
  if (!match) {
    return null;
  }
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .slice(0, 3)
      .split("")
      .map((digit) => digit + digit)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) {
    return null;
  }
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
};

const HUE_NAMES: readonly [maxHue: number, name: string][] = [
  [15, "red"],
  [40, "orange"],
  [65, "yellow"],
  [165, "green"],
  [195, "teal"],
  [250, "blue"],
  [290, "purple"],
  [340, "pink"],
  [360, "red"],
];

export const colourName = (colour: string): string | null => {
  const normalized = colour.trim().toLowerCase();
  if (!normalized || normalized === "transparent") {
    return null;
  }
  const paletteName = paletteColourNames.get(normalized);
  if (paletteName) {
    return paletteName;
  }
  const rgb = parseHex(normalized);
  if (!rgb) {
    return /^[a-z]+$/.test(normalized) ? normalized : null;
  }
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  if (saturation < 0.15 || delta < 0.06) {
    if (lightness < 0.15) {
      return "black";
    }
    if (lightness > 0.92) {
      return "white";
    }
    return lightness > 0.65
      ? "light grey"
      : lightness < 0.35
      ? "dark grey"
      : "grey";
  }

  let hue: number;
  if (max === rgb.r) {
    hue = ((rgb.g - rgb.b) / delta) % 6;
  } else if (max === rgb.g) {
    hue = (rgb.b - rgb.r) / delta + 2;
  } else {
    hue = (rgb.r - rgb.g) / delta + 4;
  }
  hue = (hue * 60 + 360) % 360;
  const hueName = HUE_NAMES.find(([maxHue]) => hue < maxHue)?.[1] ?? "red";
  const shade = lightness > 0.75 ? "light " : lightness < 0.3 ? "dark " : "";
  return `${shade}${hueName}`;
};

const KIND_NAMES: Record<string, string> = {
  rectangle: "Rectangle",
  diamond: "Diamond",
  ellipse: "Ellipse",
  stickynote: "Sticky note",
  text: "Text",
  arrow: "Arrow",
  line: "Line",
  freedraw: "Freehand drawing",
  image: "Image",
  frame: "Frame",
  magicframe: "AI frame",
  embeddable: "Embedded content",
  iframe: "Web page",
};

const PLURAL_KIND_NAMES: Record<string, string> = {
  stickynote: "sticky notes",
  text: "texts",
  freedraw: "freehand drawings",
  magicframe: "AI frames",
  embeddable: "embeds",
  iframe: "web pages",
};

export const kindName = (element: SketchSyncElement) => {
  if (element.type === "line" && "polygon" in element && element.polygon) {
    return "Polygon";
  }
  if (element.type === "arrow" && "elbowed" in element && element.elbowed) {
    return "Elbow arrow";
  }
  return KIND_NAMES[element.type] ?? "Shape";
};

export const pluralKindName = (type: string) =>
  PLURAL_KIND_NAMES[type] ?? `${(KIND_NAMES[type] ?? "shape").toLowerCase()}s`;

const withArticle = (phrase: string) =>
  `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;

export const quoteText = (text: string) => {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const shortened =
    collapsed.length > MAX_QUOTED_TEXT
      ? `${collapsed.slice(0, MAX_QUOTED_TEXT - 1).trimEnd()}…`
      : collapsed;
  return `'${shortened}'`;
};

const getElementText = (
  element: SketchSyncElement,
  labelsByContainerId: ReadonlyMap<string, SketchSyncTextElement>,
) => {
  if (element.type === "text") {
    return element.originalText || element.text;
  }
  if (isFrameLike(element)) {
    return "name" in element ? element.name ?? "" : "";
  }
  const label = labelsByContainerId.get(element.id);
  return label ? label.originalText || label.text : "";
};

export const hasEditableText = (element: SketchSyncElement | null) =>
  !!element &&
  (element.type === "text" ||
    element.type === "rectangle" ||
    element.type === "diamond" ||
    element.type === "ellipse" ||
    element.type === "stickynote" ||
    element.type === "arrow");

export const referenceName = (
  element: SketchSyncElement | undefined,
  labelsByContainerId: ReadonlyMap<string, SketchSyncTextElement>,
) => {
  if (!element) {
    return "an unknown item";
  }
  const text = getElementText(element, labelsByContainerId).trim();
  return text ? quoteText(text) : withArticle(kindName(element).toLowerCase());
};

const DIRECTION_NAMES = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

const getPointingDirection = (element: SketchSyncElement) => {
  if (!hasPoints(element) || element.points.length < 2) {
    return null;
  }
  const [startX, startY] = element.points[0];
  const [endX, endY] = element.points[element.points.length - 1];
  if (startX === endX && startY === endY) {
    return null;
  }
  const angle = Math.atan2(endY - startY, endX - startX);
  const octant = Math.round(angle / (Math.PI / 4));
  return DIRECTION_NAMES[(octant + 8) % 8];
};

const getBindingTargetId = (
  element: SketchSyncElement,
  end: "startBinding" | "endBinding",
): string | null => {
  const binding = (element as { [key: string]: unknown })[end] as
    | { elementId?: string }
    | null
    | undefined;
  return binding?.elementId ?? null;
};

const describeArrowTitle = (
  element: SketchSyncElement,
  tree: Pick<OutlineTree, "elementsById" | "labelsByContainerId">,
) => {
  const label = tree.labelsByContainerId.get(element.id);
  const parts = [kindName(element)];
  if (label) {
    parts.push(`with text ${quoteText(label.originalText || label.text)}`);
  }
  const startId = getBindingTargetId(element, "startBinding");
  const endId = getBindingTargetId(element, "endBinding");
  if (startId) {
    parts.push(
      `from ${referenceName(
        tree.elementsById.get(startId),
        tree.labelsByContainerId,
      )}`,
    );
  }
  if (endId) {
    parts.push(
      `to ${referenceName(
        tree.elementsById.get(endId),
        tree.labelsByContainerId,
      )}`,
    );
  }
  if (!startId && !endId && element.type === "arrow") {
    const direction = getPointingDirection(element);
    if (direction) {
      parts.push(`pointing ${direction}`);
    }
  }
  return parts.join(" ");
};

const describeTitle = (
  node: OutlineNode,
  tree: Pick<OutlineTree, "elementsById" | "labelsByContainerId">,
) => {
  const { element } = node;
  if (!element) {
    return `Group of ${node.children.length} items`;
  }
  if (element.type === "arrow" || element.type === "line") {
    return describeArrowTitle(element, tree);
  }
  const text = getElementText(element, tree.labelsByContainerId).trim();
  if (element.type === "text") {
    return `Text ${quoteText(text)}`;
  }
  if (element.type === "stickynote") {
    return text ? `Sticky note ${quoteText(text)}` : "Empty sticky note";
  }
  if (isFrameLike(element)) {
    return text ? `${kindName(element)} ${quoteText(text)}` : kindName(element);
  }
  if (element.type === "embeddable" || element.type === "iframe") {
    const host = linkHost(element.link);
    return host ? `${kindName(element)} from ${host}` : kindName(element);
  }
  return text
    ? `${kindName(element)} with text ${quoteText(text)}`
    : kindName(element);
};

const linkHost = (link: string | null) => {
  if (!link) {
    return null;
  }
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export const positionInWords = (bounds: Bounds, reference: Bounds) => {
  const centerX = (bounds[0] + bounds[2]) / 2;
  const centerY = (bounds[1] + bounds[3]) / 2;
  const width = reference[2] - reference[0];
  const height = reference[3] - reference[1];
  const fractionX = width > 0 ? (centerX - reference[0]) / width : 0.5;
  const fractionY = height > 0 ? (centerY - reference[1]) / height : 0.5;
  const column =
    fractionX < 1 / 3 ? "left" : fractionX > 2 / 3 ? "right" : "centre";
  const row = fractionY < 1 / 3 ? "top" : fractionY > 2 / 3 ? "bottom" : null;
  if (!row) {
    return column;
  }
  return column === "centre" ? row : `${row} ${column}`;
};

const describeColours = (element: SketchSyncElement) => {
  const stroke =
    element.strokeColor.toLowerCase() ===
    DEFAULT_ELEMENT_PROPS.strokeColor.toLowerCase()
      ? null
      : colourName(element.strokeColor);
  const fill = colourName(element.backgroundColor);

  switch (element.type) {
    case "text":
      return stroke ? `${stroke} text` : null;
    case "stickynote":
      return fill;
    case "image":
    case "frame":
    case "magicframe":
    case "embeddable":
    case "iframe":
      return null;
    case "arrow":
    case "line":
    case "freedraw":
      return (
        [stroke, fill && `${fill} fill`].filter(Boolean).join(", ") || null
      );
    default:
      return (
        [stroke && `${stroke} outline`, fill && `${fill} fill`]
          .filter(Boolean)
          .join(", ") || null
      );
  }
};

const listNames = (names: readonly string[]) => {
  const shown = names.slice(0, MAX_LISTED_CONNECTIONS);
  const hidden = names.length - shown.length;
  const all = hidden > 0 ? [...shown, `${hidden} more`] : shown;
  return all.length > 1
    ? `${all.slice(0, -1).join(", ")} and ${all[all.length - 1]}`
    : all[0];
};

const describeConnections = (
  element: SketchSyncElement,
  tree: Pick<OutlineTree, "elementsById" | "labelsByContainerId">,
) => {
  const outgoing: string[] = [];
  const incoming: string[] = [];
  for (const bound of element.boundElements ?? []) {
    if (bound.type !== "arrow") {
      continue;
    }
    const arrow = tree.elementsById.get(bound.id);
    if (!arrow) {
      continue;
    }
    const startId = getBindingTargetId(arrow, "startBinding");
    const endId = getBindingTargetId(arrow, "endBinding");
    if (startId === element.id && endId && endId !== element.id) {
      outgoing.push(
        referenceName(tree.elementsById.get(endId), tree.labelsByContainerId),
      );
    } else if (endId === element.id && startId && startId !== element.id) {
      incoming.push(
        referenceName(tree.elementsById.get(startId), tree.labelsByContainerId),
      );
    }
  }
  const parts = [];
  if (outgoing.length) {
    parts.push(
      `${outgoing.length > 1 ? "arrows" : "arrow"} to ${listNames(outgoing)}`,
    );
  }
  if (incoming.length) {
    parts.push(
      `${incoming.length > 1 ? "arrows" : "arrow"} from ${listNames(incoming)}`,
    );
  }
  return parts.join("; ") || null;
};

const frameReference = (
  frame: SketchSyncElement,
  tree: Pick<OutlineTree, "labelsByContainerId">,
) => {
  const name = getElementText(frame, tree.labelsByContainerId).trim();
  const kind = frame.type === "magicframe" ? "AI frame" : "frame";
  return name ? `${kind} ${quoteText(name)}` : `the ${kind}`;
};

const countItems = (node: OutlineNode) =>
  node.children.length === 1 ? "1 item" : `${node.children.length} items`;

export const describeNode = (
  node: OutlineNode,
  tree: Pick<
    OutlineTree,
    "elementsById" | "labelsByContainerId" | "nodesByKey" | "boardBounds"
  >,
): OutlineDescription => {
  const title = describeTitle(node, tree);
  const frameNode = node.frameKey ? tree.nodesByKey.get(node.frameKey) : null;
  const reference = frameNode ? frameNode.bounds : tree.boardBounds;
  const position = positionInWords(node.bounds, reference);
  const width = Math.round(node.bounds[2] - node.bounds[0]);
  const height = Math.round(node.bounds[3] - node.bounds[1]);
  const { element } = node;

  const colours = element ? describeColours(element) : null;
  const connections = element ? describeConnections(element, tree) : null;
  const contents =
    node.children.length && (!element || isFrameLike(element))
      ? countItems(node)
      : null;
  const flags = [
    element?.locked ? "locked" : null,
    element?.link && element.type !== "embeddable" && element.type !== "iframe"
      ? `links to ${linkHost(element.link) ?? "a page"}`
      : null,
  ].filter(Boolean);

  const details = [
    position,
    `${width} × ${height}`,
    contents,
    colours,
    connections,
    ...flags,
  ]
    .filter(Boolean)
    .join(" · ");

  const where = frameNode?.element
    ? `${position} of ${frameReference(frameNode.element, tree)}`
    : `${position} of the board`;
  const spoken = [
    title,
    contents,
    where,
    `${width} by ${height}`,
    colours,
    connections,
    ...flags,
  ]
    .filter(Boolean)
    .join(", ");

  return { title, details, spoken };
};

const hasDeletedBinding = (
  element: SketchSyncElement,
  end: "startBinding" | "endBinding",
  deletedIds: ReadonlySet<string>,
) => {
  const targetId = getBindingTargetId(element, end);
  return !!targetId && deletedIds.has(targetId);
};

export const getDeletableIds = (
  node: OutlineNode,
  elementsById: ReadonlyMap<string, SketchSyncElement>,
) =>
  node.memberIds.filter((id) => {
    const element = elementsById.get(id);
    return !!element && !element.locked;
  });

export const deleteFromBoard = (
  sceneElements: readonly SketchSyncElement[],
  idsToDelete: readonly string[],
): SketchSyncElement[] => {
  const deletedIds = new Set(idsToDelete);
  for (const element of sceneElements) {
    if (
      element.type === "text" &&
      element.containerId &&
      deletedIds.has(element.containerId)
    ) {
      deletedIds.add(element.id);
    }
  }

  return sceneElements.map((element) => {
    if (element.isDeleted) {
      return element;
    }
    if (deletedIds.has(element.id)) {
      return newElementWith(element, { isDeleted: true });
    }

    const updates: { [key: string]: unknown } = {};
    if (element.frameId && deletedIds.has(element.frameId)) {
      updates.frameId = null;
    }
    if (hasDeletedBinding(element, "startBinding", deletedIds)) {
      updates.startBinding = null;
    }
    if (hasDeletedBinding(element, "endBinding", deletedIds)) {
      updates.endBinding = null;
    }
    if (element.boundElements?.some((bound) => deletedIds.has(bound.id))) {
      updates.boundElements = element.boundElements.filter(
        (bound) => !deletedIds.has(bound.id),
      );
    }
    return Object.keys(updates).length
      ? newElementWith(element, updates as Partial<SketchSyncElement>)
      : element;
  });
};
