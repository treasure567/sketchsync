// Re-export from @sketchsync/editor for backwards compatibility
export {
  exportScene,
  exportToClipboard,
  MIME_TYPES,
} from "@sketchsync/editor/scene/export";

export type {
  ExportSceneData,
  ExportSceneConfig,
  ExportSceneOptions,
} from "@sketchsync/editor/scene/export";

export { elementsOverlappingBBox } from "@sketchsync/element";
export { getCommonBounds } from "@sketchsync/element";
export type { RenderEnvironment } from "@sketchsync/element";
