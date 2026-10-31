import { inflate } from "pako";

import { MIME_TYPES } from "@sketchsync/common";

import { getDefaultAppState } from "../appState";
import { exportCanvas, prepareElementsForExport } from "../data";
import * as filesystem from "../data/filesystem";
import {
  PDF_MAX_PIXEL_COUNT,
  PDF_MIN_PIXEL_RATIO,
  encodeImageAsPdf,
  exportToPdf,
  getPdfPageSize,
  getPdfPixelRatio,
} from "../data/pdf";

import { API } from "./helpers/api";

import type { RasterImage } from "../data/pdf";

const toLatin1 = (bytes: Uint8Array) => {
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  return text;
};

const readBlob = async (blob: Blob) =>
  new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    }),
  );

const parsePdf = (bytes: Uint8Array) => {
  const text = toLatin1(bytes);

  const getObject = (id: number) => {
    const start = text.indexOf(`\n${id} 0 obj\n`) + 1;
    const end = text.indexOf("endobj", start);
    return { start, body: text.slice(start, end) };
  };

  const getStream = (id: number) => {
    const { start, body } = getObject(id);
    const length = Number(body.match(/\/Length (\d+)/)![1]);
    const streamStart = text.indexOf("stream\n", start) + "stream\n".length;
    return bytes.subarray(streamStart, streamStart + length);
  };

  const mediaBox = text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)!;
  const image = text.match(
    /\/Subtype \/Image \/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceRGB/,
  )!;

  return {
    text,
    getObject,
    getStream,
    page: { width: Number(mediaBox[1]), height: Number(mediaBox[2]) },
    image: { width: Number(image[1]), height: Number(image[2]) },
  };
};

const solidImage = (
  width: number,
  height: number,
  [r, g, b, a]: [number, number, number, number],
): RasterImage => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
};

describe("encodeImageAsPdf", () => {
  it("writes a well-formed single-page PDF", () => {
    const bytes = encodeImageAsPdf(
      solidImage(3, 2, [255, 0, 0, 255]),
      { width: 90, height: 52.5 },
      { title: "Board — draft" },
    );
    const pdf = parsePdf(bytes);

    expect(pdf.text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.text.endsWith("%%EOF\n")).toBe(true);
    expect(pdf.page).toEqual({ width: 90, height: 52.5 });
    expect(pdf.image).toEqual({ width: 3, height: 2 });
    expect(pdf.text).toContain("/Count 1");

    const startXref = Number(pdf.text.match(/startxref\n(\d+)/)![1]);
    expect(pdf.text.slice(startXref, startXref + 4)).toBe("xref");
    const offsets = [
      ...pdf.text.slice(startXref).matchAll(/^(\d{10}) 00000 n $/gm),
    ].map((match) => Number(match[1]));
    expect(offsets.length).toBeGreaterThan(0);
    offsets.forEach((offset, index) => {
      expect(pdf.text.slice(offset).startsWith(`${index + 1} 0 obj\n`)).toBe(
        true,
      );
    });
  });

  it("stores the pixels losslessly and skips the alpha mask when opaque", () => {
    const pdf = parsePdf(
      encodeImageAsPdf(solidImage(2, 2, [10, 20, 30, 255]), {
        width: 10,
        height: 10,
      }),
    );

    expect(pdf.text).not.toContain("/SMask");
    expect(Array.from(inflate(pdf.getStream(5)))).toEqual([
      10, 20, 30, 10, 20, 30, 10, 20, 30, 10, 20, 30,
    ]);
  });

  it("keeps transparency in a soft mask", () => {
    const pdf = parsePdf(
      encodeImageAsPdf(solidImage(2, 1, [0, 0, 0, 128]), {
        width: 10,
        height: 10,
      }),
    );

    expect(pdf.getObject(5).body).toContain("/SMask 7 0 R");
    expect(pdf.getObject(7).body).toContain("/ColorSpace /DeviceGray");
    expect(Array.from(inflate(pdf.getStream(7)))).toEqual([128, 128]);
  });

  it("encodes the title as UTF-16 so any file name survives", () => {
    const pdf = parsePdf(
      encodeImageAsPdf(
        solidImage(1, 1, [0, 0, 0, 255]),
        { width: 1, height: 1 },
        { title: "é" },
      ),
    );
    expect(pdf.getObject(6).body).toContain("/Title <FEFF00E9>");
  });
});

describe("PDF sizing", () => {
  it("raises low export scales to the print minimum", () => {
    expect(getPdfPixelRatio(100, 100, 1)).toBe(PDF_MIN_PIXEL_RATIO);
    expect(getPdfPixelRatio(100, 100, 3)).toBe(3);
  });

  it("caps the resolution of huge drawings by the pixel budget", () => {
    const ratio = getPdfPixelRatio(20_000, 10_000, 3);
    expect(ratio).toBeLessThan(1);
    expect(20_000 * ratio * 10_000 * ratio).toBeCloseTo(PDF_MAX_PIXEL_COUNT);
  });

  it("converts CSS pixels to points and keeps pages within 200 inches", () => {
    expect(getPdfPageSize(960, 480)).toEqual({ width: 720, height: 360 });

    const huge = getPdfPageSize(40_000, 20_000);
    expect(huge.width).toBe(14_400);
    expect(huge.height).toBe(7_200);
  });
});

describe("exportToPdf", () => {
  const rectangle = () =>
    API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });

  const exportRectangle = async (scale: number) =>
    parsePdf(
      await readBlob(
        await exportToPdf({
          data: { elements: [rectangle()], files: null },
          config: { scale, padding: 10 },
        }),
      ),
    );

  it("sizes the page to the drawing, independent of the scale", async () => {
    const atScale1 = await exportRectangle(1);
    const atScale3 = await exportRectangle(3);

    expect(atScale1.text.startsWith("%PDF")).toBe(true);
    expect(atScale1.page).toEqual({ width: 90, height: 52.5 });
    expect(atScale3.page).toEqual(atScale1.page);
  });

  it("renders the image at the chosen scale", async () => {
    const atScale2 = await exportRectangle(2);
    const atScale3 = await exportRectangle(3);

    expect(atScale2.image).toEqual({ width: 240, height: 140 });
    expect(atScale3.image).toEqual({ width: 360, height: 210 });
  });

  it("is what the export dialog saves, with the scene's name", async () => {
    const fileSave = vi
      .spyOn(filesystem, "fileSave")
      .mockResolvedValue(null as any);

    const appState = {
      ...getDefaultAppState(),
      name: "Sprint board",
      exportScale: 2,
      exportBackground: true,
      exportWithDarkMode: true,
      width: 1000,
      height: 1000,
      offsetLeft: 0,
      offsetTop: 0,
    } as Parameters<typeof exportCanvas>[2];
    const { exportedElements, exportingFrame } = prepareElementsForExport(
      [rectangle()],
      appState,
      false,
    );

    await exportCanvas(
      "pdf",
      exportedElements,
      appState,
      {},
      {
        exportingFrame,
      },
    );

    expect(fileSave).toHaveBeenCalledTimes(1);
    const [blobPromise, options] = fileSave.mock.calls[0];
    expect(options).toMatchObject({
      name: "Sprint board",
      extension: "pdf",
      mimeTypes: [MIME_TYPES.pdf],
    });
    const blob = await blobPromise;
    expect(blob.type).toBe(MIME_TYPES.pdf);
    const pdf = parsePdf(await readBlob(blob));
    expect(pdf.image).toEqual({ width: 240, height: 140 });
    expect(pdf.text).toContain("/Title <FEFF");

    fileSave.mockRestore();
  });
});
