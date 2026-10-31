import type { SketchSyncTextElement } from "@sketchsync/editor/element/types";
import type { Arrowhead } from "@sketchsync/editor/element/types";
import { ContainerStyle, LabelStyle, SubGraph, Vertex, Edge } from "../interfaces.js";
import { SketchSyncVertexElement } from "../types.js";
import type { Mutable } from "@sketchsync/editor/common/utility-types";
/**
 * The width of a line of Sketchfont text (estimated when there's no canvas to
 * measure it on)
 */
export declare const measureLabelLineWidthAtFontSize: (line: string, fontSize: number) => number;
/**
 * Compute groupIds for each element
 */
export interface ArrowType {
    startArrowhead?: Arrowhead | null;
    endArrowhead?: Arrowhead | null;
}
export declare const computeSketchSyncArrowType: (mermaidArrowType: string) => ArrowType;
export declare const getText: (element: Vertex | Edge | SubGraph) => string;
/**
 * Compute style for vertex
 */
export declare const computeSketchSyncVertexStyle: (style: ContainerStyle) => Partial<Mutable<SketchSyncVertexElement>>;
/**
 * Compute style for label
 */
export declare const computeSketchSyncVertexLabelStyle: (style: LabelStyle) => Partial<Mutable<SketchSyncTextElement>>;
