import { GraphImage, Flowchart, Sequence, Class, ERD, State } from "../interfaces.js";
export interface PeleConfig {
    fontSize?: number;
    maxEdges?: number;
    /** Maximum number of characters in the definition. */
    maxTextSize?: number;
    curve?: string;
}
/**
 * Pele reports syntax errors at the end of a definition (e.g. a missing `end`)
 * on the line after its last one, with an empty excerpt. They're moved to the
 * end of its last non-empty line instead, as Mermaid reports them: that's the
 * line SketchSync highlights, shows and tries fixing.
 *
 * Lines are numbered as Pele (and Mermaid) parse them, i.e. without e.g. the
 * comments before them, but trailing (blank) lines are always kept.
 */
export declare const pointEndOfInputErrorAtLastLine: (error: unknown, definition: string) => unknown;
/**
 * Renders a Mermaid definition to the SVG `parsePele` reads it from (or, for
 * diagram types it doesn't convert, returns as an image), e.g. to compare it
 * with the conversion.
 */
export declare const renderPeleSvg: (definition: string, config?: PeleConfig) => Promise<string>;
/**
 * Parses a Mermaid definition with Pele, a Mermaid renderer that lays diagrams
 * out without a DOM.
 *
 * Flowcharts, sequence, class, ER and state diagrams are converted to
 * SketchSync elements; other diagram types are returned as an image.
 */
export declare const parsePele: (definition: string, config?: PeleConfig) => Promise<Flowchart | Sequence | Class | ERD | State | GraphImage>;
