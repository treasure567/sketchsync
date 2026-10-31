import type { SequenceModel } from "pele/lazy";
import type { Sequence } from "../interfaces.js";
export interface PeleSequenceOptions {
    fontSize: number;
    /** Width of a line of text in SketchSync, if it can be measured. */
    measureText?: (text: string, fontSize: number) => number | null;
}
/**
 * Reads a sequence diagram from Pele's parsed model (actors, messages, notes,
 * boxes) and the SVG Pele rendered it to (positions and sizes).
 */
export declare const parsePeleSequence: (model: SequenceModel, root: Element, options: PeleSequenceOptions) => Sequence;
