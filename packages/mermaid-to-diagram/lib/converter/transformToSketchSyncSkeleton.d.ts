import { Arrow, Line, Node, Text } from "../elementSkeleton.js";
export declare const transformToSketchSyncLineSkeleton: (line: Line) => any;
export declare const transformToSketchSyncTextSkeleton: (element: Text) => any;
export declare const transformToSketchSyncContainerSkeleton: (element: Exclude<Node, Line | Arrow | Text>) => any;
export declare const transformToSketchSyncArrowSkeleton: (arrow: Arrow) => any;
