import { useState, useLayoutEffect } from "react";

import { EVENT, THEME } from "@sketchsync/common";

import { useEditorInterface, useSketchSyncContainer } from "../components/App";
import { useUIAppState } from "../context/ui-appState";

export const useCreatePortalContainer = (opts?: {
  className?: string;
  parentSelector?: string;
}) => {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  const editorInterface = useEditorInterface();
  const { theme } = useUIAppState();

  const { container: sketchsyncContainer } = useSketchSyncContainer();

  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("sketchsync", ...(opts?.className?.split(/\s+/) || []));
      div.classList.toggle(
        "sketchsync--mobile",
        editorInterface.formFactor === "phone",
      );
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, theme, editorInterface.formFactor, opts?.className]);

  useLayoutEffect(() => {
    const ownerDocument = sketchsyncContainer?.ownerDocument;
    const container = opts?.parentSelector
      ? sketchsyncContainer?.querySelector(opts.parentSelector)
      : ownerDocument?.body;

    if (!container || !ownerDocument) {
      return;
    }

    const div = ownerDocument.createElement("div");

    container.appendChild(div);

    // outside the editor container (whose own listeners cover it), so don't
    // let a file dropped on e.g. a modal make the browser open it
    const onFileDrag = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "none";
      }
    };
    if (!opts?.parentSelector) {
      div.addEventListener(EVENT.DRAG_OVER, onFileDrag);
      div.addEventListener(EVENT.DROP, onFileDrag);
    }

    setDiv(div);

    return () => {
      div.removeEventListener(EVENT.DRAG_OVER, onFileDrag);
      div.removeEventListener(EVENT.DROP, onFileDrag);
      container.removeChild(div);
    };
  }, [sketchsyncContainer, opts?.parentSelector]);

  return div;
};
