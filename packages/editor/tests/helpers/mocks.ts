import * as MermaidToDiagram from "@sketchsync/mermaid-to-diagram";
import React from "react";
import { vi } from "vitest";

import type { parseMermaidToDiagram } from "@sketchsync/mermaid-to-diagram";
import type { throttleRAF as throttleRAFType } from "@sketchsync/common";

type ThrottledFn<T extends unknown[]> = ((...args: T) => void) & {
  flush: () => void;
  cancel: () => void;
};

export const mockThrottleRAF: typeof throttleRAFType = <T extends unknown[]>(
  fn: (...args: T) => void,
) => {
  const ret = ((...args: T) => {
    fn(...args);
  }) as ThrottledFn<T>;

  ret.flush = () => {};
  ret.cancel = () => {};

  return ret;
};

export const mockMermaidToDiagram = (opts: {
  parseMermaidToDiagram: typeof parseMermaidToDiagram;
  mockRef?: boolean;
}) => {
  vi.mock("@sketchsync/mermaid-to-diagram", async (importActual) => {
    const module = (await importActual()) as any;

    return {
      __esModule: true,
      ...module,
    };
  });
  const parseMermaidToDiagramSpy = vi.spyOn(
    MermaidToDiagram,
    "parseMermaidToDiagram",
  );

  parseMermaidToDiagramSpy.mockImplementation(opts.parseMermaidToDiagram);

  if (opts.mockRef) {
    vi.spyOn(React, "useRef").mockReturnValue({
      current: {
        parseMermaidToDiagram: parseMermaidToDiagramSpy,
      },
    });
  }
};

// Mock for HTMLImageElement (use with `vi.unstubAllGlobals()`)
// as jsdom.resources: "usable" throws an error on image load
export const mockHTMLImageElement = (
  naturalWidth: number,
  naturalHeight: number,
) => {
  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        Object.defineProperty(this, "naturalWidth", {
          value: naturalWidth,
        });
        Object.defineProperty(this, "naturalHeight", {
          value: naturalHeight,
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};

// Mocks for multiple HTMLImageElements (dimensions are assigned in the order of image initialization)
export const mockMultipleHTMLImageElements = (
  sizes: (readonly [number, number])[],
) => {
  const _sizes = [...sizes];

  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        const size = _sizes.shift();
        if (!size) {
          throw new Error("Insufficient sizes");
        }

        Object.defineProperty(this, "naturalWidth", {
          value: size[0],
        });
        Object.defineProperty(this, "naturalHeight", {
          value: size[1],
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};
