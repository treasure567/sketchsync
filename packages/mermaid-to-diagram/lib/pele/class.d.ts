import type { ClassModel } from "pele/lazy";
import type { Class } from "../interfaces.js";
export interface PeleClassOptions {
    fontSize: number;
}
/**
 * Reads a class diagram from Pele's parsed model (relations, notes,
 * namespaces) and the SVG Pele rendered it to (positions, sizes, the text of
 * members and methods, styles).
 */
export declare const parsePeleClass: (model: ClassModel, root: Element, options: PeleClassOptions) => Class;
