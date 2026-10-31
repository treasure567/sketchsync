import type { StateModel } from "pele/lazy";
import { State } from "../interfaces.js";
export interface PeleStateOptions {
    fontSize: number;
}
/**
 * Reads a state diagram from the SVG Pele rendered it to: states, composite
 * states, notes, and the transitions between them (whose ends are found from
 * where they're drawn, as Pele's model doesn't list the transitions of
 * composite states).
 */
export declare const parsePeleState: (_model: StateModel, root: Element, options: PeleStateOptions) => State;
