import { SketchSyncConfig } from "../index.js";
import { MermaidToDiagramResult, Flowchart, Sequence } from "../interfaces.js";
export declare class GraphConverter<T = Flowchart | Sequence> {
    private converter;
    constructor({ converter, }: {
        converter: (graph: T, config: Required<SketchSyncConfig>) => MermaidToDiagramResult;
    });
    convert: (graph: T, config: SketchSyncConfig) => MermaidToDiagramResult;
}
