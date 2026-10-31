import { FlowchartToSketchSyncSkeletonConverter } from "./converter/types/flowchart.js";
import { GraphImageConverter } from "./converter/types/graphImage.js";
import { SequenceToSketchSyncSkeletonConvertor } from "./converter/types/sequence.js";
import { classToSketchSyncSkeletonConvertor } from "./converter/types/class.js";
import { erToSketchSyncSkeletonConvertor } from "./converter/types/er.js";
import { stateToSketchSyncSkeletonConvertor } from "./converter/types/state.js";
import { dedupeConsecutivePoints } from "./utils.js";
const normalizeLinearElementPoints = (result) => {
    return {
        ...result,
        elements: result.elements.map((element) => {
            if (!("points" in element) || !Array.isArray(element.points)) {
                return element;
            }
            const points = element.points;
            if (points.length < 2) {
                return element;
            }
            const dedupedPoints = dedupeConsecutivePoints(points);
            if (dedupedPoints.length === points.length) {
                return element;
            }
            return {
                ...element,
                points: dedupedPoints,
            };
        }),
    };
};
export const graphToSketchSync = (graph, options = {}) => {
    const result = (() => {
        switch (graph.type) {
            case "graphImage": {
                return GraphImageConverter.convert(graph, options);
            }
            case "flowchart": {
                return FlowchartToSketchSyncSkeletonConverter.convert(graph, options);
            }
            case "sequence": {
                return SequenceToSketchSyncSkeletonConvertor.convert(graph, options);
            }
            case "class": {
                return classToSketchSyncSkeletonConvertor.convert(graph, options);
            }
            case "erd": {
                return erToSketchSyncSkeletonConvertor.convert(graph, options);
            }
            case "state": {
                return stateToSketchSyncSkeletonConvertor.convert(graph, options);
            }
            default: {
                throw new Error(`graphToSketchSync: unknown graph type "${graph.type}, only flowcharts are supported!"`);
            }
        }
    })();
    return normalizeLinearElementPoints(result);
};
