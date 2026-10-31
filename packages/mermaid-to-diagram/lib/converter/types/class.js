import { nanoid } from "nanoid";
import { transformToSketchSyncArrowSkeleton, transformToSketchSyncContainerSkeleton, transformToSketchSyncLineSkeleton, transformToSketchSyncTextSkeleton, } from "../transformToSketchSyncSkeleton.js";
import { GraphConverter } from "../GraphConverter.js";
import { NODE_BACKGROUND_COLOR } from "../../constants.js";
export const classToSketchSyncSkeletonConvertor = new GraphConverter({
    converter: (chart) => {
        const elements = [];
        // relations below the (opaque) classes they connect
        Object.values(chart.arrows).forEach((arrow) => {
            if (!arrow) {
                return;
            }
            const sketchsyncElement = transformToSketchSyncArrowSkeleton(arrow);
            elements.push(sketchsyncElement);
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
                        break;
                }
                elements.push(sketchsyncElement);
            });
        });
        Object.values(chart.lines).forEach((line) => {
            if (!line) {
                return;
            }
            elements.push(transformToSketchSyncLineSkeleton(line));
        });
        Object.values(chart.text).forEach((ele) => {
            const sketchsyncElement = transformToSketchSyncTextSkeleton(ele);
            elements.push(sketchsyncElement);
        });
        Object.values(chart.namespaces).forEach((namespace) => {
            const classIds = Object.keys(namespace.classes);
            const children = [...classIds];
            const chartElements = [...chart.lines, ...chart.arrows, ...chart.text];
            classIds.forEach((classId) => {
                const childIds = chartElements
                    .filter((ele) => ele.metadata && ele.metadata.classId === classId)
                    .map((ele) => ele.id);
                if (childIds.length) {
                    children.push(...childIds);
                }
            });
            const frame = {
                type: "frame",
                id: nanoid(),
                name: namespace.id,
                children,
            };
            elements.push(frame);
        });
        return { elements };
    },
});
