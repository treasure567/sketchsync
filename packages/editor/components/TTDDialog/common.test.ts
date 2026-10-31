import { describe, expect, it, vi } from "vitest";

import { convertMermaidToDiagram } from "./common";

type ConvertMermaidArgs = Parameters<typeof convertMermaidToDiagram>[0];
type ParseMermaidToDiagram = Awaited<
  ConvertMermaidArgs["mermaidToDiagramLib"]["api"]
>["parseMermaidToDiagram"];

const createConvertArgs = (
  mermaidDefinition: string,
  parseMermaidToDiagram: ParseMermaidToDiagram,
): ConvertMermaidArgs => {
  const parent = document.createElement("div");
  const canvas = document.createElement("div");
  parent.appendChild(canvas);

  return {
    canvasRef: { current: canvas },
    mermaidToDiagramLib: {
      status: "loaded" as const,
      api: Promise.resolve({ parseMermaidToDiagram }),
    },
    mermaidDefinition,
    setError: vi.fn(),
    data: {
      current: {
        elements: [],
        files: null,
      },
    },
    theme: "light",
  };
};

describe("convertMermaidToDiagram", () => {
  it("returns the original parse error when quote-normalized fallback also fails", async () => {
    const originalError = new Error("Parse error on line 9: ...");
    const fallbackError = new Error("Parse error on line 6: ...");

    const parseMermaidToDiagram = vi
      .fn<ParseMermaidToDiagram>()
      .mockRejectedValueOnce(originalError)
      .mockRejectedValueOnce(fallbackError);

    const mermaidDefinition =
      'graph TD\nA["One"]\nB["Two"]x\nC["Three"]\nD["Four"]';

    const result = await convertMermaidToDiagram(
      createConvertArgs(mermaidDefinition, parseMermaidToDiagram),
    );

    expect(parseMermaidToDiagram).toHaveBeenCalledTimes(2);
    expect(parseMermaidToDiagram).toHaveBeenNthCalledWith(1, mermaidDefinition);
    expect(parseMermaidToDiagram).toHaveBeenNthCalledWith(
      2,
      mermaidDefinition.replace(/"/g, "'"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(originalError);
    }
  });

  it("does not retry quote normalization when the input has no double quotes", async () => {
    const originalError = new Error("Parse error on line 9: ...");
    const parseMermaidToDiagram = vi
      .fn<ParseMermaidToDiagram>()
      .mockRejectedValueOnce(originalError);

    const mermaidDefinition = "graph TD\nA[One]\nB[Two]x";

    const result = await convertMermaidToDiagram(
      createConvertArgs(mermaidDefinition, parseMermaidToDiagram),
    );

    expect(parseMermaidToDiagram).toHaveBeenCalledTimes(1);
    expect(parseMermaidToDiagram).toHaveBeenCalledWith(mermaidDefinition);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(originalError);
    }
  });
});
