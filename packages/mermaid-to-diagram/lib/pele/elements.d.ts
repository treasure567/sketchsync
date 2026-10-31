import type { Arrow, Line, Text } from "../elementSkeleton.js";
import type { Position } from "../interfaces.js";
import { Bounds } from "./svg.js";
/**
 * A label's text, broken into lines where Pele wrapped it: Pele sizes shapes
 * for the lines it wraps labels into, which SketchSync would wrap elsewhere
 * (or not at all).
 */
export declare const withPeleLineBreaks: (text: string, label: Element | null) => string;
export declare const hasClass: (element: Element, className: string) => boolean;
/** Where Pele drew a text, as a text element (colored as styled). */
export declare const toText: (element: Element, root: Element, defaultFontSize: number, extra?: Partial<Text>) => Text;
export declare const toLine: (start: Position, end: Position, extra?: Partial<Line>) => Line;
/** Every straight segment of a path (e.g. dividers, a stick figure's limbs). */
export declare const pathToLines: (path: Element, root: Element, extra?: Partial<Line>) => Line[];
/**
 * An edge's route (extended to the far end of its arrowheads) and whether it
 * has arrowheads at its start and at its end.
 */
export declare const readEdge: (group: Element, root: Element) => {
    line: Element;
    route: Position[];
    hasStartMarker: boolean;
    hasEndMarker: boolean;
} | undefined;
/**
 * The route, reversed if needed to start at `start` (or, if only `end` is
 * known, to end at `end`).
 */
export declare const orientRoute: (route: Position[], start: Bounds | undefined, end: Bounds | undefined) => Position[];
/** An arrow along a route (of at least 2 points). */
export declare const routeToArrow: (route: Position[], extra?: Partial<Arrow>) => Arrow;
/**
 * Where along the route Pele drew an edge's label (0 to 1), e.g. away from
 * other labels.
 */
export declare const getLabelPosition: (route: Position[], label: Element | undefined, root: Element) => number | undefined;
export declare const toBounds: (element: {
    x: number;
    y: number;
    width?: number;
    height?: number;
}) => Bounds;
