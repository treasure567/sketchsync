import type { ErModel } from "pele/lazy";
import type { ERD } from "../interfaces.js";
export interface PeleERDOptions {
    fontSize: number;
}
/**
 * Reads an ER diagram from Pele's parsed model (entities, relationships) and
 * the SVG Pele rendered it to (positions, sizes, the attributes' columns,
 * styles).
 */
export declare const parsePeleERD: (model: ErModel, root: Element, options: PeleERDOptions) => ERD;
