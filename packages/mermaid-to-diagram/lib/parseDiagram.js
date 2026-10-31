import { DEFAULT_FONT_SIZE } from "./constants.js";
import { parsePele } from "./pele/parsePele.js";
/**
 * Parses and lays out a Mermaid definition with Pele (https://pele.run), a
 * Mermaid renderer that needs no DOM to lay diagrams out.
 */
export const parseDiagram = (definition, config = {}) => parsePele(definition, {
    fontSize: parseInt(config.themeVariables?.fontSize ?? "") || DEFAULT_FONT_SIZE,
    maxEdges: config.maxEdges,
    maxTextSize: config.maxTextSize,
    curve: config.flowchart?.curve,
});
