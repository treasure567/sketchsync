import { transformToSketchSyncArrowSkeleton, transformToSketchSyncContainerSkeleton, transformToSketchSyncLineSkeleton, transformToSketchSyncTextSkeleton, } from "../transformToSketchSyncSkeleton.js";
import { GraphConverter } from "../GraphConverter.js";
import { NODE_BACKGROUND_COLOR } from "../../constants.js";
export const erToSketchSyncSkeletonConvertor = new GraphConverter({
    converter: (chart) => {
        const elements = [];
        // relationships below the (opaque) entities they connect
        chart.arrows.forEach((arrow) => {
            elements.push(transformToSketchSyncArrowSkeleton(arrow));
        });
        chart.nodes.forEach((node) => {
            if (!node || !node.length) {
                return;
            }
            node.forEach((element) => {
                let sketchsyncElement;
                switch (element.type) {
                    case "line":
                        sketchsyncElement = transformToSketchSyncLineSkeleton(element);
                        break;
                    case "rectangle":
                    case "ellipse":
                        sketchsyncElement = transformToSketchSyncContainerSkeleton({
                            ...element,
                            bgColor: element.bgColor ?? NODE_BACKGROUND_COLOR,
                        });
                        break;
                    case "text":
                        sketchsyncElement = transformToSketchSyncTextSkeleton(element);
                        break;
                    default:
                        throw `unknown type ${element.type}`;
                }
                elements.push(sketchsyncElement);
            });
        });
        chart.lines.forEach((line) => {
            elements.push(transformToSketchSyncLineSkeleton(line));
        });
        chart.text.forEach((textElement) => {
            elements.push(transformToSketchSyncTextSkeleton(textElement));
        });
        return { elements };
    },
});
