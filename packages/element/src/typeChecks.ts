import { ROUNDNESS, assertNever } from "@sketchsync/common";

import { pointsEqual } from "@sketchsync/math";

import type { ElementOrToolType } from "@sketchsync/editor/types";

import type { MarkNonNullable } from "@sketchsync/common/utility-types";

import type {
  SketchSyncElement,
  SketchSyncTextElement,
  SketchSyncEmbeddableElement,
  SketchSyncLinearElement,
  SketchSyncBindableElement,
  SketchSyncFreeDrawElement,
  InitializedSketchSyncImageElement,
  SketchSyncImageElement,
  SketchSyncTextElementWithContainer,
  SketchSyncTextContainer,
  SketchSyncFrameElement,
  RoundnessType,
  SketchSyncFrameLikeElement,
  SketchSyncElementType,
  SketchSyncIframeElement,
  SketchSyncIframeLikeElement,
  SketchSyncMagicFrameElement,
  SketchSyncArrowElement,
  SketchSyncElbowArrowElement,
  SketchSyncLineElement,
  SketchSyncFlowchartNodeElement,
  SketchSyncLinearElementSubType,
  SketchSyncStickyNoteElement,
} from "./types";

export const isInitializedImageElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & InitializedSketchSyncImageElement => {
  return !!element && element.type === "image" && !!element.fileId;
};

export const isImageElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncImageElement => {
  return !!element && element.type === "image";
};

export const isEmbeddableElement = <T extends SketchSyncElement>(
  element: T | null | undefined,
): element is T & SketchSyncEmbeddableElement => {
  return !!element && element.type === "embeddable";
};

export const isIframeElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncIframeElement => {
  return !!element && element.type === "iframe";
};

export const isIframeLikeElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncIframeLikeElement => {
  return (
    !!element && (element.type === "iframe" || element.type === "embeddable")
  );
};

export const isTextElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncTextElement => {
  return element != null && element.type === "text";
};

export const isStickyNoteElement = <T extends SketchSyncElement>(
  element: T | null | undefined,
): element is T & SketchSyncStickyNoteElement => {
  return element != null && element.type === "stickynote";
};

export const isFrameElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncFrameElement => {
  return element != null && element.type === "frame";
};

export const isMagicFrameElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncMagicFrameElement => {
  return element != null && element.type === "magicframe";
};

export const isFrameLikeElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncFrameLikeElement => {
  return (
    element != null &&
    (element.type === "frame" || element.type === "magicframe")
  );
};

export const isFreeDrawElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncFreeDrawElement => {
  return element != null && isFreeDrawElementType(element.type);
};

export const isFreeDrawElementType = (
  elementType: SketchSyncElementType,
): boolean => {
  return elementType === "freedraw";
};

export const isLinearElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncLinearElement => {
  return element != null && isLinearElementType(element.type);
};

export const isLineElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncLineElement => {
  return element != null && element.type === "line";
};

export const isArrowElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncArrowElement => {
  return element != null && element.type === "arrow";
};

export const isElbowArrow = <T extends SketchSyncElement>(
  element?: T,
): element is T & SketchSyncElbowArrowElement => {
  return isArrowElement(element) && element.elbowed;
};

/**
 * sharp or curved arrow, but not elbow
 */
export const isSimpleArrow = <T extends SketchSyncElement>(
  element?: T,
): element is T & SketchSyncArrowElement => {
  return isArrowElement(element) && !element.elbowed;
};

export const isSharpArrow = <T extends SketchSyncElement>(
  element?: T,
): element is T & SketchSyncArrowElement => {
  return isArrowElement(element) && !element.elbowed && !element.roundness;
};

export const isCurvedArrow = <T extends SketchSyncElement>(
  element?: T,
): element is T & SketchSyncArrowElement => {
  return (
    isArrowElement(element) && !element.elbowed && element.roundness !== null
  );
};

export const isLinearElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return (
    elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
  );
};

export const isBindingElement = <T extends SketchSyncElement>(
  element?: T | null,
  includeLocked = true,
): element is T & SketchSyncArrowElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    isBindingElementType(element.type)
  );
};

export const isBindingElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return elementType === "arrow";
};

export const isBindableElement = <T extends SketchSyncElement>(
  element: T | null | undefined,
  includeLocked = true,
): element is T & SketchSyncBindableElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "stickynote" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

export const isRectanguloidElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "stickynote" ||
      element.type === "diamond" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

// TODO: Remove this when proper distance calculation is introduced
// @see binding.ts:distanceToBindableElement()
export const isRectangularElement = <T extends SketchSyncElement>(
  element?: T | null,
): element is T & SketchSyncBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "stickynote" ||
      element.type === "image" ||
      element.type === "text" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      element.type === "freedraw")
  );
};

export const isTextBindableContainer = <T extends SketchSyncElement>(
  element: T | null,
  includeLocked = true,
): element is T & SketchSyncTextContainer => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "stickynote" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      isArrowElement(element))
  );
};

export const isSketchSyncElement = (
  element: any,
): element is SketchSyncElement => {
  const type: SketchSyncElementType | undefined = element?.type;
  if (!type) {
    return false;
  }
  switch (type) {
    case "text":
    case "diamond":
    case "rectangle":
    case "stickynote":
    case "iframe":
    case "embeddable":
    case "ellipse":
    case "arrow":
    case "freedraw":
    case "line":
    case "frame":
    case "magicframe":
    case "image":
    case "selection": {
      return true;
    }
    default: {
      assertNever(type, null);
      return false;
    }
  }
};

export const isFlowchartNodeElement = <T extends SketchSyncElement>(
  element: T,
): element is T & SketchSyncFlowchartNodeElement => {
  return (
    element.type === "rectangle" ||
    element.type === "stickynote" ||
    element.type === "ellipse" ||
    element.type === "diamond"
  );
};

export const hasBoundTextElement = <T extends SketchSyncElement>(
  element: T | null,
): element is T &
  MarkNonNullable<SketchSyncBindableElement, "boundElements"> => {
  return (
    isTextBindableContainer(element) &&
    !!element.boundElements?.some(({ type }) => type === "text")
  );
};

export const isBoundToContainer = <T extends SketchSyncElement>(
  element: T | null,
): element is T & SketchSyncTextElementWithContainer => {
  return (
    element !== null &&
    "containerId" in element &&
    element.containerId !== null &&
    isTextElement(element)
  );
};

export const isArrowBoundToElement = (element: SketchSyncArrowElement) => {
  return !!element.startBinding || !!element.endBinding;
};

export const isUsingAdaptiveRadius = (type: string) =>
  type === "rectangle" ||
  type === "embeddable" ||
  type === "iframe" ||
  type === "image";

export const isUsingProportionalRadius = (type: string) =>
  type === "line" ||
  type === "arrow" ||
  type === "diamond" ||
  type === "stickynote";

export const canApplyRoundnessTypeToElement = (
  roundnessType: RoundnessType,
  element: SketchSyncElement,
) => {
  if (
    (roundnessType === ROUNDNESS.ADAPTIVE_RADIUS ||
      // if legacy roundness, it can be applied to elements that currently
      // use adaptive radius
      roundnessType === ROUNDNESS.LEGACY) &&
    isUsingAdaptiveRadius(element.type)
  ) {
    return true;
  }
  if (
    roundnessType === ROUNDNESS.PROPORTIONAL_RADIUS &&
    isUsingProportionalRadius(element.type)
  ) {
    return true;
  }

  return false;
};

export const getDefaultRoundnessTypeForElement = (
  element: SketchSyncElement,
) => {
  if (isUsingProportionalRadius(element.type)) {
    return {
      type: ROUNDNESS.PROPORTIONAL_RADIUS,
    };
  }

  if (isUsingAdaptiveRadius(element.type)) {
    return {
      type: ROUNDNESS.ADAPTIVE_RADIUS,
    };
  }

  return null;
};

export const getLinearElementSubType = (
  element: SketchSyncLinearElement,
): SketchSyncLinearElementSubType => {
  if (isSharpArrow(element)) {
    return "sharpArrow";
  }
  if (isCurvedArrow(element)) {
    return "curvedArrow";
  }
  if (isElbowArrow(element)) {
    return "elbowArrow";
  }
  return "line";
};

/**
 * Checks if current element points meet all the conditions for polygon=true
 * (this isn't a element type check, for that use isLineElement).
 *
 * If you want to check if points *can* be turned into a polygon, use
 *  canBecomePolygon(points).
 */
export const isValidPolygon = (
  points: SketchSyncLineElement["points"],
): boolean => {
  return points.length > 3 && pointsEqual(points[0], points[points.length - 1]);
};

export const canBecomePolygon = (
  points: SketchSyncLineElement["points"],
): boolean => {
  return (
    points.length > 3 ||
    // 3-point polygons can't have all points in a single line
    (points.length === 3 && !pointsEqual(points[0], points[points.length - 1]))
  );
};

export const isEligibleFrameChildType = (type: ElementOrToolType) => {
  switch (type) {
    case "rectangle":
    case "stickynote":
    case "diamond":
    case "ellipse":
    case "arrow":
    case "line":
    case "freedraw":
    case "text":
    case "image":
    case "frame":
    case "embeddable": {
      return true;
    }
    default: {
      return false;
    }
  }
};
