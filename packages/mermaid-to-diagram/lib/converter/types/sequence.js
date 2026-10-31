import { nanoid } from "nanoid";
import { GraphConverter } from "../GraphConverter.js";
import { transformToSketchSyncLineSkeleton, transformToSketchSyncTextSkeleton, transformToSketchSyncContainerSkeleton, transformToSketchSyncArrowSkeleton, } from "../transformToSketchSyncSkeleton.js";
const GROUP_RECT_PADDING = 10;
const GROUP_LABEL_FONT_SIZE = 16;
const GROUP_LABEL_MIN_HEIGHT = 24;
const GROUP_LABEL_HORIZONTAL_OFFSET = 4;
const SKETCHSYNC_LINE_HEIGHT = 1.25;
const isTransparentFill = (fill) => {
    if (!fill) {
        return true;
    }
    const normalizedFill = fill.trim().toLowerCase();
    return (normalizedFill === "transparent" ||
        normalizedFill === "none" ||
        normalizedFill === "rgba(0,0,0,0)" ||
        normalizedFill === "rgba(0, 0, 0, 0)");
};
const estimateTextWidth = (text, fontSize) => {
    const longestLineLength = Math.max(...text.split("\n").map((line) => line.length));
    return Math.max(20, Math.round(longestLineLength * fontSize * 0.6));
};
const estimateTextHeight = (text, fontSize) => Math.max(GROUP_LABEL_MIN_HEIGHT, text.split("\n").length * fontSize * SKETCHSYNC_LINE_HEIGHT);
export const SequenceToSketchSyncSkeletonConvertor = new GraphConverter({
    converter: (chart) => {
        const elements = [];
        const activations = [];
        const notes = [];
        Object.values(chart.nodes).forEach((node) => {
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
                        sketchsyncElement = transformToSketchSyncContainerSkeleton(element);
                        break;
                    case "text":
                        sketchsyncElement = transformToSketchSyncTextSkeleton(element);
                        break;
                    default:
                        throw `unknown type ${element.type}`;
                        break;
                }
                if (element.type === "rectangle" && element?.subtype === "activation") {
                    activations.push(sketchsyncElement);
                }
                else if (element.type === "rectangle" && element.subtype === "note") {
                    notes.push(sketchsyncElement);
                }
                else {
                    elements.push(sketchsyncElement);
                }
            });
        });
        Object.values(chart.lines).forEach((line) => {
            if (!line) {
                return;
            }
            elements.push(transformToSketchSyncLineSkeleton(line));
        });
        const sequenceNumbers = [];
        Object.values(chart.arrows).forEach((arrow) => {
            if (!arrow) {
                return;
            }
            elements.push(transformToSketchSyncArrowSkeleton(arrow));
            if (arrow.sequenceNumber) {
                sequenceNumbers.push(transformToSketchSyncContainerSkeleton(arrow.sequenceNumber));
            }
        });
        elements.push(...activations);
        // On top of the lifelines and activations, which a note over them, or a
        // message's number, can sit on
        elements.push(...notes);
        elements.push(...sequenceNumbers);
        // loops
        if (chart.loops) {
            const { lines, texts, nodes } = chart.loops;
            lines.forEach((line) => {
                elements.push(transformToSketchSyncLineSkeleton(line));
            });
            texts.forEach((text) => {
                elements.push(transformToSketchSyncTextSkeleton(text));
            });
            nodes.forEach((node) => {
                elements.push(transformToSketchSyncContainerSkeleton(node));
            });
        }
        if (chart.groups) {
            chart.groups.forEach((group) => {
                const { actorKeys, name } = group;
                const groupLabelHeight = name
                    ? estimateTextHeight(name, GROUP_LABEL_FONT_SIZE)
                    : 0;
                const groupLabelWidth = name
                    ? estimateTextWidth(name, GROUP_LABEL_FONT_SIZE)
                    : 0;
                let groupRectX;
                let groupRectY;
                let groupRectWidth;
                let groupRectHeight;
                if (group.bounds) {
                    ({
                        x: groupRectX,
                        y: groupRectY,
                        width: groupRectWidth,
                        height: groupRectHeight,
                    } = group.bounds);
                }
                else {
                    if (!actorKeys.length) {
                        return;
                    }
                    const actors = elements.filter((ele) => {
                        if (ele.id) {
                            const hyphenIndex = ele.id.indexOf("-");
                            const id = ele.id.substring(0, hyphenIndex);
                            return actorKeys.includes(id);
                        }
                        return false;
                    });
                    if (!actors.length) {
                        return;
                    }
                    let minX = Infinity;
                    let minY = Infinity;
                    let maxX = 0;
                    let maxY = 0;
                    actors.forEach((actor) => {
                        if (actor.x === undefined ||
                            actor.y === undefined ||
                            actor.width === undefined ||
                            actor.height === undefined) {
                            return;
                        }
                        minX = Math.min(minX, actor.x);
                        minY = Math.min(minY, actor.y);
                        maxX = Math.max(maxX, actor.x + actor.width);
                        maxY = Math.max(maxY, actor.y + actor.height);
                    });
                    if (!Number.isFinite(minX) ||
                        !Number.isFinite(minY) ||
                        !Number.isFinite(maxX) ||
                        !Number.isFinite(maxY)) {
                        return;
                    }
                    const contentWidth = maxX - minX + GROUP_RECT_PADDING * 2;
                    groupRectWidth = Math.max(contentWidth, groupLabelWidth + GROUP_RECT_PADDING * 2);
                    // Reserve a header inside the group instead of placing its title
                    // above the border, where multiline names otherwise collide with
                    // neighbors.
                    groupRectX =
                        minX - GROUP_RECT_PADDING - (groupRectWidth - contentWidth) / 2;
                    groupRectY = minY - GROUP_RECT_PADDING - groupLabelHeight;
                    groupRectHeight =
                        maxY - minY + GROUP_RECT_PADDING * 2 + groupLabelHeight;
                }
                // Not grouped with what's in it: SketchSync keeps a group's elements
                // together in z-order, which would put them under the `rect`
                // highlights drawn over the box
                const groupRect = transformToSketchSyncContainerSkeleton({
                    type: "rectangle",
                    x: groupRectX,
                    y: groupRectY,
                    width: groupRectWidth,
                    height: groupRectHeight,
                    bgColor: isTransparentFill(group.fill) ? undefined : group.fill,
                    strokeColor: "#1f1f1f",
                    strokeWidth: 1,
                    id: nanoid(),
                });
                elements.unshift(groupRect);
                if (name) {
                    const groupLabel = transformToSketchSyncTextSkeleton({
                        type: "text",
                        id: nanoid(),
                        text: name,
                        x: groupRectX + GROUP_LABEL_HORIZONTAL_OFFSET,
                        y: groupRectY + GROUP_RECT_PADDING,
                        width: groupLabelWidth,
                        height: groupLabelHeight,
                        fontSize: GROUP_LABEL_FONT_SIZE,
                        color: "#1f1f1f",
                    });
                    elements.push(groupLabel);
                }
            });
        }
        return { elements };
    },
});
