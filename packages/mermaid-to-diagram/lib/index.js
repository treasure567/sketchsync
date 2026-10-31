import { DEFAULT_FONT_SIZE } from "./constants.js";
import { graphToSketchSync } from "./graphToSketchSync.js";
import { parseDiagram } from "./parseDiagram.js";
const parseMermaidToDiagram = async (definition, config) => {
    const fontSize = parseInt(config?.themeVariables?.fontSize ?? "") || DEFAULT_FONT_SIZE;
    const parsedMermaidData = await parseDiagram(definition, config);
    // Only font size supported for sketchsync elements
    const sketchsyncElements = graphToSketchSync(parsedMermaidData, {
        fontSize,
    });
    return sketchsyncElements;
};
export { parseMermaidToDiagram };
