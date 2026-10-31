import type { FlowchartModel, ParsedDiagramModel } from "pele/lazy";
import { Flowchart } from "../interfaces.js";
export interface PeleFlowchartOptions {
    fontSize: number;
    /** Width of a line of label text in SketchSync, if it can be measured. */
    measureText?: (text: string) => number | null;
}
/**
 * Reads a flowchart from Pele's parsed model (labels, shapes, links between
 * nodes) and the SVG Pele rendered it to (positions, sizes, routes, resolved
 * styles). Elements Pele didn't draw (e.g. invisible `~~~` links, `style`
 * statements targeting a subgraph) are skipped, and so are links between a
 * subgraph and what's inside it, which Mermaid doesn't draw either.
 */
export declare const parsePeleFlowchart: (model: FlowchartModel & Partial<Pick<ParsedDiagramModel, "mermaidType">>, root: Element, options: PeleFlowchartOptions) => Flowchart;
