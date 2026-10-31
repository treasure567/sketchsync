import type { MermaidConfig } from "./interfaces.js";
import { parsePele } from "./pele/parsePele.js";
export type ParsedDiagram = Awaited<ReturnType<typeof parsePele>>;
/**
 * Parses and lays out a Mermaid definition with Pele (https://pele.run), a
 * Mermaid renderer that needs no DOM to lay diagrams out.
 */
export declare const parseDiagram: (definition: string, config?: MermaidConfig) => Promise<ParsedDiagram>;
