import type { MermaidConfig } from "./interfaces.js";
export interface SketchSyncConfig {
    fontSize?: number;
}
declare const parseMermaidToDiagram: (definition: string, config?: MermaidConfig) => Promise<import("./interfaces.js").MermaidToDiagramResult>;
export { parseMermaidToDiagram };
export type { MermaidConfig };
