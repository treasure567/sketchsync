import type { LocalPoint, Radians } from "@sketchsync/math";

import type {
  FONT_FAMILY,
  ROUNDNESS,
  TEXT_ALIGN,
  THEME,
  VERTICAL_ALIGN,
} from "@sketchsync/common";

import type {
  MakeBrand,
  MarkNonNullable,
  Merge,
  ValueOf,
} from "@sketchsync/common/utility-types";

export type ChartType = "bar" | "line" | "radar";
export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag";
export type FontFamilyKeys = keyof typeof FONT_FAMILY;
export type FontFamilyValues = typeof FONT_FAMILY[FontFamilyKeys];
export type Theme = typeof THEME[keyof typeof THEME];
export type FontString = string & { _brand: "fontString" };
export type GroupId = string;
export type PointerType = "mouse" | "pen" | "touch";
export type StrokeRoundness = "round" | "sharp";
export type RoundnessType = ValueOf<typeof ROUNDNESS>;
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type TextAlign = typeof TEXT_ALIGN[keyof typeof TEXT_ALIGN];

type VerticalAlignKeys = keyof typeof VERTICAL_ALIGN;
export type VerticalAlign = typeof VERTICAL_ALIGN[VerticalAlignKeys];
export type FractionalIndex = string & { _brand: "franctionalIndex" };

export type BoundElement = Readonly<{
  id: SketchSyncLinearElement["id"];
  type: "arrow" | "text";
}>;

type _SketchSyncElementBase = Readonly<{
  id: string;
  x: number;
  y: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roundness: null | { type: RoundnessType; value?: number };
  roughness: number;
  opacity: number;
  width: number;
  height: number;
  angle: Radians;
  /** Random integer used to seed shape generation so that the roughjs shape
      doesn't differ across renders. */
  seed: number;
  /** Integer that is sequentially incremented on each change. Used to reconcile
      elements during collaboration or when saving to server. */
  version: number;
  /** Random integer that is regenerated on each change.
      Used for deterministic reconciliation of updates during collaboration,
      in case the versions (see above) are identical. */
  versionNonce: number;
  /** String in a fractional form defined by https://github.com/rocicorp/fractional-indexing.
      Used for ordering in multiplayer scenarios, such as during reconciliation or undo / redo.
      Always kept in sync with the array order by `syncMovedIndices` and `syncInvalidIndices`.
      Could be null, i.e. for new elements which were not yet assigned to the scene. */
  index: FractionalIndex | null;
  isDeleted: boolean;
  /** List of groups the element belongs to.
      Ordered from deepest to shallowest. */
  groupIds: readonly GroupId[];
  frameId: string | null;
  /** other elements that are bound to this element */
  boundElements: readonly BoundElement[] | null;
  /** epoch (ms) timestamp of last element update */
  updated: number;
  /** Client wall-clock creation time in epoch milliseconds; null if unknown.
      Preserved for this element's lifetime, including edits and undo/redo,
      and excluded from `ElementUpdate` (mutateElement / newElementWith).
      Duplicating an element starts a new lifetime. Not an ordering clock. */
  created: number | null;
  link: string | null;
  locked: boolean;
  customData?: Record<string, any>;
}>;

export type SketchSyncSelectionElement = _SketchSyncElementBase & {
  type: "selection";
};

export type SketchSyncRectangleElement = _SketchSyncElementBase & {
  type: "rectangle";
};

export type SketchSyncStickyNoteElement = _SketchSyncElementBase &
  Readonly<{
    type: "stickynote";
    /**
     * The height the user set, from which the layout derives `height`: the
     * note grows above it to fit its label and never shrinks below it
     */
    baseHeight: number;
  }>;

export type SketchSyncDiamondElement = _SketchSyncElementBase & {
  type: "diamond";
};

export type SketchSyncEllipseElement = _SketchSyncElementBase & {
  type: "ellipse";
};

export type SketchSyncEmbeddableElement = _SketchSyncElementBase &
  Readonly<{
    type: "embeddable";
  }>;

export type MagicGenerationData =
  | {
      status: "pending";
    }
  | { status: "done"; html: string }
  | {
      status: "error";
      message?: string;
      code: "ERR_GENERATION_INTERRUPTED" | string;
    };

export type SketchSyncIframeElement = _SketchSyncElementBase &
  Readonly<{
    type: "iframe";
    // TODO move later to AI-specific frame
    customData?: { generationData?: MagicGenerationData };
  }>;

export type SketchSyncIframeLikeElement =
  | SketchSyncIframeElement
  | SketchSyncEmbeddableElement;

export type IframeData =
  | {
      intrinsicSize: { w: number; h: number };
      error?: Error;
      sandbox?: { allowSameOrigin?: boolean };
    } & (
      | { type: "video" | "generic"; link: string }
      | { type: "document"; srcdoc: (theme: Theme) => string }
    );

export type ImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type SketchSyncImageElement = _SketchSyncElementBase &
  Readonly<{
    type: "image";
    fileId: FileId | null;
    /** whether respective file is persisted */
    status: "pending" | "saved" | "error";
    /** X and Y scale factors <-1, 1>, used for image axis flipping */
    scale: [number, number];
    /** whether an element is cropped */
    crop: ImageCrop | null;
  }>;

export type InitializedSketchSyncImageElement = MarkNonNullable<
  SketchSyncImageElement,
  "fileId"
>;

export type SketchSyncFrameElement = _SketchSyncElementBase & {
  type: "frame";
  name: string | null;
};

export type SketchSyncMagicFrameElement = _SketchSyncElementBase & {
  type: "magicframe";
  name: string | null;
};

export type SketchSyncFrameLikeElement =
  | SketchSyncFrameElement
  | SketchSyncMagicFrameElement;

/**
 * These are elements that don't have any additional properties.
 */
export type SketchSyncGenericElement =
  | SketchSyncSelectionElement
  | SketchSyncRectangleElement
  | SketchSyncDiamondElement
  | SketchSyncEllipseElement;

export type SketchSyncFlowchartNodeElement =
  | SketchSyncRectangleElement
  | SketchSyncStickyNoteElement
  | SketchSyncDiamondElement
  | SketchSyncEllipseElement;

export type SketchSyncRectanguloidElement =
  | SketchSyncRectangleElement
  | SketchSyncStickyNoteElement
  | SketchSyncImageElement
  | SketchSyncTextElement
  | SketchSyncFreeDrawElement
  | SketchSyncIframeLikeElement
  | SketchSyncFrameLikeElement
  | SketchSyncEmbeddableElement
  | SketchSyncSelectionElement;

/**
 * SketchSyncElement should be JSON serializable and (eventually) contain
 * no computed data. The list of all SketchSyncElements should be shareable
 * between peers and contain no state local to the peer.
 */
export type SketchSyncElement =
  | SketchSyncGenericElement
  | SketchSyncStickyNoteElement
  | SketchSyncTextElement
  | SketchSyncLinearElement
  | SketchSyncArrowElement
  | SketchSyncFreeDrawElement
  | SketchSyncImageElement
  | SketchSyncFrameElement
  | SketchSyncMagicFrameElement
  | SketchSyncIframeElement
  | SketchSyncEmbeddableElement;

export type SketchSyncNonSelectionElement = Exclude<
  SketchSyncElement,
  SketchSyncSelectionElement
>;

export type Ordered<TElement extends SketchSyncElement> = TElement & {
  index: FractionalIndex;
};

export type OrderedSketchSyncElement = Ordered<SketchSyncElement>;

export type NonDeleted<TElement extends SketchSyncElement> = TElement & {
  isDeleted: false;
};

export type NonDeletedSketchSyncElement = NonDeleted<SketchSyncElement>;

export type SketchSyncTextElement = _SketchSyncElementBase &
  Readonly<{
    type: "text";
    fontSize: number;
    fontFamily: FontFamilyValues;
    /**
     * The font size the user picked, from which the layout derives `fontSize`.
     * Today only sticky note labels have one: the auto-fit shrinks below it
     * and never above it (compare `baseHeight`, which the note grows above).
     * `null` for every other text. Read it through `getBaseFontSize` —
     * generic binding repair can detach a label without clearing this, so
     * the container decides its meaning.
     */
    baseFontSize: number | null;
    text: string;
    textAlign: TextAlign;
    verticalAlign: VerticalAlign;
    containerId: SketchSyncTextContainer["id"] | null;
    originalText: string;
    /**
     * If `true` the width will fit the text. If `false`, the text will
     * wrap to fit the width.
     *
     * @default true
     */
    autoResize: boolean;
    /**
     * Unitless line height (aligned to W3C). To get line height in px, multiply
     *  with font size (using `getLineHeightInPx` helper).
     */
    lineHeight: number & { _brand: "unitlessLineHeight" };
    /**
     * Position of text bound to a linear element (such as an arrow),
     * expressed as a normalized arc-length parameter (0–1) along the
     * container's whole path. Independent of how the path is segmented,
     * so it survives midpoint insertion and other geometry changes.
     * */
    labelPosition?: number | null;
  }>;

export type SketchSyncBindableElement =
  | SketchSyncRectangleElement
  | SketchSyncStickyNoteElement
  | SketchSyncDiamondElement
  | SketchSyncEllipseElement
  | SketchSyncTextElement
  | SketchSyncImageElement
  | SketchSyncIframeElement
  | SketchSyncEmbeddableElement
  | SketchSyncFrameElement
  | SketchSyncMagicFrameElement;

export type SketchSyncTextContainer =
  | SketchSyncRectangleElement
  | SketchSyncStickyNoteElement
  | SketchSyncDiamondElement
  | SketchSyncEllipseElement
  | SketchSyncArrowElement;

export type SketchSyncTextElementWithContainer = {
  containerId: SketchSyncTextContainer["id"];
} & SketchSyncTextElement;

export type FixedPoint = [number, number];

export type BindMode = "inside" | "orbit" | "skip";

export type FixedPointBinding = {
  elementId: SketchSyncBindableElement["id"];

  // Represents the fixed point binding information in form of a vertical and
  // horizontal ratio (i.e. a percentage value in the 0.0-1.0 range). This ratio
  // gives the user selected fixed point by multiplying the bound element width
  // with fixedPoint[0] and the bound element height with fixedPoint[1] to get the
  // bound element-local point coordinate.
  fixedPoint: FixedPoint;

  // Determines whether the arrow remains outside the shape or is allowed to
  // go all the way inside the shape up to the exact fixed point.
  mode: BindMode;
};

type Index = number;

export type PointsPositionUpdates = Map<
  Index,
  { point: LocalPoint; isDragging?: boolean }
>;

export type CardinalityArrowhead =
  | "cardinality_one"
  | "cardinality_many"
  | "cardinality_one_or_many"
  | "cardinality_exactly_one"
  | "cardinality_zero_or_one"
  | "cardinality_zero_or_many";

export type ArrowheadLegacy =
  | "dot"
  | "crowfoot_one"
  | "crowfoot_many"
  | "crowfoot_one_or_many";

export type Arrowhead =
  | "arrow"
  | "bar"
  | "circle"
  | "circle_outline"
  | "triangle"
  | "triangle_outline"
  | "diamond"
  | "diamond_outline"
  | CardinalityArrowhead;

export type AnyArrowhead = Arrowhead | ArrowheadLegacy;

export type SketchSyncLinearElement = _SketchSyncElementBase &
  Readonly<{
    type: "line" | "arrow";
    points: readonly LocalPoint[];
    startBinding: FixedPointBinding | null;
    endBinding: FixedPointBinding | null;
    startArrowhead: Arrowhead | null;
    endArrowhead: Arrowhead | null;
  }>;

export type SketchSyncLineElement = SketchSyncLinearElement &
  Readonly<{
    type: "line";
    polygon: boolean;
  }>;

export type FixedSegment = {
  start: LocalPoint;
  end: LocalPoint;
  index: Index;
};

export type SketchSyncArrowElement = SketchSyncLinearElement &
  Readonly<{
    type: "arrow";
    elbowed: boolean;
  }>;

export type SketchSyncElbowArrowElement = Merge<
  SketchSyncArrowElement,
  {
    elbowed: true;
    fixedSegments: readonly FixedSegment[] | null;
    startBinding: FixedPointBinding | null;
    endBinding: FixedPointBinding | null;
    /**
     * Marks that the 3rd point should be used as the 2nd point of the arrow in
     * order to temporarily hide the first segment of the arrow without losing
     * the data from the points array. It allows creating the expected arrow
     * path when the arrow with fixed segments is bound on a horizontal side and
     * moved to a vertical and vica versa.
     */
    startIsSpecial: boolean | null;
    /**
     * Marks that the 3rd point backwards from the end should be used as the 2nd
     * point of the arrow in order to temporarily hide the last segment of the
     * arrow without losing the data from the points array. It allows creating
     * the expected arrow path when the arrow with fixed segments is bound on a
     * horizontal side and moved to a vertical and vica versa.
     */
    endIsSpecial: boolean | null;
  }
>;

export type StrokeVariability = "variable" | "constant";

export type StrokeOptions = Readonly<{
  variability: StrokeVariability;
  streamline: number;
}>;

export type SketchSyncFreeDrawElement = _SketchSyncElementBase &
  Readonly<{
    type: "freedraw";
    points: readonly LocalPoint[];
    pressures: readonly number[];
    simulatePressure: boolean;
    strokeOptions: StrokeOptions;
  }>;

export type FileId = string & { _brand: "FileId" };

export type SketchSyncElementType = SketchSyncElement["type"];

/**
 * Map of sketchsync elements.
 * Unspecified whether deleted or non-deleted.
 * Can be a subset of Scene elements.
 */
export type ElementsMap = Map<SketchSyncElement["id"], SketchSyncElement>;

/**
 * Map of non-deleted elements.
 * Can be a subset of Scene elements.
 */
export type NonDeletedElementsMap = Map<
  SketchSyncElement["id"],
  NonDeletedSketchSyncElement
> &
  MakeBrand<"NonDeletedElementsMap">;

/**
 * Map of all sketchsync Scene elements, including deleted.
 * Not a subset. Use this type when you need access to current Scene elements.
 */
export type SceneElementsMap = Map<
  SketchSyncElement["id"],
  Ordered<SketchSyncElement>
> &
  MakeBrand<"SceneElementsMap">;

/**
 * Map of all non-deleted Scene elements.
 * Not a subset. Use this type when you need access to current Scene elements.
 */
export type NonDeletedSceneElementsMap = Map<
  SketchSyncElement["id"],
  Ordered<NonDeletedSketchSyncElement>
> &
  MakeBrand<"NonDeletedSceneElementsMap">;

export type ElementsMapOrArray =
  | readonly SketchSyncElement[]
  | Readonly<ElementsMap>;

export type NonDeletedElementsMapOrArray =
  | readonly NonDeletedSketchSyncElement[]
  | Readonly<NonDeletedElementsMap | NonDeletedSceneElementsMap>;

export type SketchSyncLinearElementSubType =
  | "line"
  | "sharpArrow"
  | "curvedArrow"
  | "elbowArrow";

export type ConvertibleGenericTypes = "rectangle" | "diamond" | "ellipse";
export type ConvertibleLinearTypes = SketchSyncLinearElementSubType;
export type ConvertibleTypes = ConvertibleGenericTypes | ConvertibleLinearTypes;
