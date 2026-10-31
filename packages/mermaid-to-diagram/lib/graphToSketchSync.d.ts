import { SketchSyncConfig } from "./index.js";
import { GraphImage, MermaidToDiagramResult, Sequence, Flowchart, Class, ERD, State } from "./interfaces.js";
export declare const graphToSketchSync: (graph: Flowchart | GraphImage | Sequence | Class | ERD | State, options?: SketchSyncConfig) => MermaidToDiagramResult;
