import { Position } from "../interfaces.js";
export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare const parseSvg: (svg: string) => Element;
/** Maps `data-id` to the element for every element matching `selector`. */
export declare const getElementsByDataId: (root: Element, selector: string) => Map<string, Element>;
/**
 * Sums the `translate()` transforms of `element` and its ancestors up to
 * `root`, i.e. the offset of `element`'s local coordinates in `root`.
 */
export declare const getOffset: (element: Element, root: Element) => Position;
interface PathSegment {
    /** Absolute command, uppercase. */
    command: string;
    /** Absolute points: control points first, the segment's end point last. */
    points: Position[];
    /** An arc's (`A`) parameters. */
    arc?: {
        rx: number;
        ry: number;
        rotation: number;
        largeArc: boolean;
        sweep: boolean;
    };
}
export declare const parsePath: (d: string) => PathSegment[];
/**
 * Bounds of a shape, or of the shapes drawn inside a group (labels excluded),
 * in `root` coordinates.
 */
export declare const getShapeBounds: (group: Element, root: Element) => Bounds | null;
/**
 * The points an edge path passes through, in `root` coordinates. Cubic curves
 * keep their midpoint too (e.g. a self-loop drawn as a single curve).
 * Quadratic curves, which Pele only uses to round the corners of stepped
 * routes, keep their control point, i.e. the corner.
 */
export declare const getPathRoute: (path: Element, root: Element) => Position[];
/** Removes consecutive duplicates and the middle of collinear runs. */
export declare const simplifyRoute: (points: Position[], epsilon?: number) => Position[];
/**
 * Pele ends routes in short straight stubs, room for its small arrowheads:
 * SketchSync's bigger ones would reach into the bends after them. The bends
 * next to each end are moved back (towards the run the route comes from), so
 * that the route ends straight for at least `minLength`, where it can.
 */
export declare const lengthenRouteEnds: (route: Position[], minLength?: number) => Position[];
/**
 * SketchSync draws a round arrow as a (uniform) Catmull-Rom spline through its
 * points, which overshoots the corners between long and short segments. Long
 * segments are split near such corners (the route stays the same), so that
 * segments next to each other are at most `maxRatio` times as long as each
 * other.
 */
export declare const evenOutRoute: (route: Position[], maxRatio?: number) => Position[];
/**
 * How far along a route (0 at its start, 1 at its end, by length) the point
 * of it closest to `point` is.
 */
export declare const getRoutePosition: (route: Position[], point: Position) => number;
interface MarkerShape {
    points: Position[];
    radius: number;
}
/** The markers (arrowheads) Pele drew at the start and at the end of a route. */
export declare const getRouteMarkers: (route: Position[], markerElements: Element[], root: Element) => {
    startMarkers: MarkerShape[];
    endMarkers: MarkerShape[];
};
/**
 * Pele shortens edge paths by the length of their arrowheads, which it draws
 * as separate shapes (`.pele-marker`). SketchSync draws arrowheads at the
 * arrow's end points, so the route is extended to the far end of the markers,
 * i.e. back to the node outline.
 */
export declare const extendRouteToMarkers: (path: Position[], markerElements: Element[], root: Element) => Position[];
/** SVG string to a data URL usable as an image source. */
export declare const svgToDataURL: (svg: string) => string;
/** Font size of an element, as set on it or inherited from its ancestors. */
export declare const getFontSize: (element: Element, root: Element, fallback: number) => number;
/**
 * The lines Pele broke a text into (at line breaks, and wrapping long ones).
 * Each line starts with a positioned `<tspan>`; unpositioned ones (e.g. bold
 * text) continue it.
 */
export declare const getTextLines: (text: Element | null) => string[];
export interface TextBlock {
    text: string;
    /** x of the anchor `textAlign` refers to, in `root` coordinates. */
    x: number;
    /** Top of the text, laid out with SketchSync's line height. */
    y: number;
    height: number;
    fontSize: number;
    textAlign: "left" | "center" | "right";
}
/** Where Pele drew a text, as an SketchSync text box. */
export declare const getTextBlock: (text: Element, root: Element, defaultFontSize: number) => TextBlock;
/** A color set in an element's inline style (by `style` or `classDef`). */
export declare const getStyleColor: (element: Element | null | undefined, property: "fill" | "stroke") => string | undefined;
/** A property set in an element's inline style. */
export declare const getStyleValue: (element: Element | null | undefined, property: string) => string | undefined;
export {};
