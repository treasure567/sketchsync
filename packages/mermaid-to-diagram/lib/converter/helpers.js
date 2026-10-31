import { CONTAINER_STYLE_PROPERTY, LABEL_STYLE_PROPERTY, } from "../interfaces.js";
import { removeMarkdown } from "../markdownToText.js";
const removeMarkdownPreservingLineBreaks = (text) => {
    let lineBreakPlaceholder = "\uE000";
    while (text.includes(lineBreakPlaceholder)) {
        lineBreakPlaceholder += "\uE000";
    }
    return removeMarkdown(text.replace(/\n/g, lineBreakPlaceholder)).replace(new RegExp(lineBreakPlaceholder, "g"), "\n");
};
let labelMeasureContext;
const getLabelMeasureContext = () => {
    if (labelMeasureContext !== undefined) {
        return labelMeasureContext;
    }
    if (typeof document === "undefined") {
        labelMeasureContext = null;
        return labelMeasureContext;
    }
    try {
        labelMeasureContext = document.createElement("canvas").getContext("2d");
    }
    catch {
        labelMeasureContext = null;
    }
    return labelMeasureContext;
};
/**
 * The width of a line of Sketchfont text (estimated when there's no canvas to
 * measure it on)
 */
export const measureLabelLineWidthAtFontSize = (line, fontSize) => {
    const context = getLabelMeasureContext();
    if (!context) {
        return line.length * fontSize * 0.6;
    }
    context.font = `${fontSize}px Sketchfont, sans-serif`;
    return context.measureText(line).width;
};
/**
 * Convert mermaid edge type to SketchSync arrow type
 */
const MERMAID_EDGE_TYPE_MAPPER = {
    arrow_circle: {
        endArrowhead: "circle",
    },
    arrow_cross: {
        endArrowhead: "bar",
    },
    arrow_open: {
        endArrowhead: null,
        startArrowhead: null,
    },
    double_arrow_circle: {
        endArrowhead: "circle",
        startArrowhead: "circle",
    },
    double_arrow_cross: {
        endArrowhead: "bar",
        startArrowhead: "bar",
    },
    double_arrow_point: {
        endArrowhead: "arrow",
        startArrowhead: "arrow",
    },
};
export const computeSketchSyncArrowType = (mermaidArrowType) => {
    return MERMAID_EDGE_TYPE_MAPPER[mermaidArrowType];
};
// Get text from graph elements, fallback markdown to text
export const getText = (element) => {
    let text = element.text;
    if (element.labelType === "markdown") {
        text = removeMarkdownPreservingLineBreaks(text);
    }
    return removeFontAwesomeIcons(text);
};
/**
 * Remove font awesome icons support from text
 */
const removeFontAwesomeIcons = (input) => {
    const fontAwesomeRegex = /\s?(fa|fab):[a-zA-Z0-9-]+/g;
    return input.replace(fontAwesomeRegex, "");
};
/**
 * Compute style for vertex
 */
export const computeSketchSyncVertexStyle = (style) => {
    const sketchsyncProperty = {};
    Object.keys(style).forEach((property) => {
        switch (property) {
            case CONTAINER_STYLE_PROPERTY.FILL: {
                sketchsyncProperty.backgroundColor = style[property];
                sketchsyncProperty.fillStyle = "solid";
                break;
            }
            case CONTAINER_STYLE_PROPERTY.STROKE: {
                sketchsyncProperty.strokeColor = style[property];
                break;
            }
            case CONTAINER_STYLE_PROPERTY.STROKE_WIDTH: {
                sketchsyncProperty.strokeWidth = Number(style[property]?.split("px")[0]);
                break;
            }
            case CONTAINER_STYLE_PROPERTY.STROKE_DASHARRAY: {
                sketchsyncProperty.strokeStyle = "dashed";
                break;
            }
        }
    });
    return sketchsyncProperty;
};
/**
 * Compute style for label
 */
export const computeSketchSyncVertexLabelStyle = (style) => {
    const sketchsyncProperty = {};
    Object.keys(style).forEach((property) => {
        switch (property) {
            case LABEL_STYLE_PROPERTY.COLOR: {
                sketchsyncProperty.strokeColor = style[property];
                break;
            }
        }
    });
    return sketchsyncProperty;
};
