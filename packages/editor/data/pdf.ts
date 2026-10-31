import { deflate } from "pako";

import { MIME_TYPES } from "@sketchsync/common";

import { exportScene } from "../scene/export";

import type { ExportSceneConfig, ExportSceneData } from "../scene/export";

export type RasterImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

export type PdfPageSize = {
  width: number;
  height: number;
};

export const PDF_POINTS_PER_CSS_PIXEL = 72 / 96;

// so that the default 1x export still prints sharply (192 DPI)
export const PDF_MIN_PIXEL_RATIO = 2;

// the largest canvas every browser (iOS Safari included) can still read back
export const PDF_MAX_PIXEL_COUNT = 4096 * 4096;

// 14,400pt (200in) is the largest page Acrobat opens
const PDF_MAX_PAGE_SIDE = 14_400;

const textEncoder = new TextEncoder();

export const getPdfPixelRatio = (
  width: number,
  height: number,
  exportScale: number,
) => {
  const preferredRatio = Math.max(exportScale, PDF_MIN_PIXEL_RATIO);
  const ratioWithinBudget = Math.sqrt(
    PDF_MAX_PIXEL_COUNT / Math.max(1, width * height),
  );
  return Math.min(preferredRatio, ratioWithinBudget);
};

export const getPdfPageSize = (
  cssWidth: number,
  cssHeight: number,
): PdfPageSize => {
  const width = cssWidth * PDF_POINTS_PER_CSS_PIXEL;
  const height = cssHeight * PDF_POINTS_PER_CSS_PIXEL;
  const fitToMaxPage = Math.min(
    1,
    PDF_MAX_PAGE_SIDE / Math.max(width, height, 1),
  );
  return { width: width * fitToMaxPage, height: height * fitToMaxPage };
};

const formatNumber = (value: number) => String(Math.round(value * 1000) / 1000);

const toPdfTextString = (text: string) => {
  let hex = "FEFF";
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
};

const splitColorAndAlpha = (image: RasterImage) => {
  const pixelCount = image.width * image.height;
  const rgba = image.data;
  const rgb = new Uint8Array(pixelCount * 3);
  const alpha = new Uint8Array(pixelCount);
  let isOpaque = true;

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const source = pixel * 4;
    const target = pixel * 3;
    rgb[target] = rgba[source];
    rgb[target + 1] = rgba[source + 1];
    rgb[target + 2] = rgba[source + 2];
    alpha[pixel] = rgba[source + 3];
    if (rgba[source + 3] !== 255) {
      isOpaque = false;
    }
  }

  return { rgb, alpha: isOpaque ? null : alpha };
};

const createPdfWriter = () => {
  const chunks: Uint8Array[] = [];
  const objectOffsets = new Map<number, number>();
  let byteLength = 0;

  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? textEncoder.encode(part) : part;
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  const writeObject = (id: number, dictionary: string, stream?: Uint8Array) => {
    objectOffsets.set(id, byteLength);
    write(`${id} 0 obj\n${dictionary}\n`);
    if (stream) {
      write("stream\n");
      write(stream);
      write("\nendstream\n");
    }
    write("endobj\n");
  };

  const finish = (trailer: string) => {
    const xrefOffset = byteLength;
    const objectCount = objectOffsets.size;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id++) {
      const offset = objectOffsets.get(id);
      if (offset === undefined) {
        throw new Error(`PDF object ${id} was never written`);
      }
      xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    write(xref);
    write(
      `trailer\n<< /Size ${
        objectCount + 1
      } ${trailer} >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    );

    const output = new Uint8Array(byteLength);
    let position = 0;
    for (const chunk of chunks) {
      output.set(chunk, position);
      position += chunk.length;
    }
    return output;
  };

  return { write, writeObject, finish };
};

export const encodeImageAsPdf = (
  image: RasterImage,
  page: PdfPageSize,
  { title }: { title?: string } = {},
) => {
  const { rgb, alpha } = splitColorAndAlpha(image);
  const pageWidth = formatNumber(page.width);
  const pageHeight = formatNumber(page.height);

  const CATALOG = 1;
  const PAGES = 2;
  const PAGE = 3;
  const CONTENT = 4;
  const IMAGE = 5;
  const INFO = 6;
  const ALPHA_MASK = 7;

  const pdf = createPdfWriter();
  // the binary comment tells transfer tools not to treat the file as text
  pdf.write("%PDF-1.4\n%");
  pdf.write(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  pdf.writeObject(CATALOG, `<< /Type /Catalog /Pages ${PAGES} 0 R >>`);
  pdf.writeObject(PAGES, `<< /Type /Pages /Kids [${PAGE} 0 R] /Count 1 >>`);
  pdf.writeObject(
    PAGE,
    `<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${IMAGE} 0 R >> >> /Contents ${CONTENT} 0 R >>`,
  );

  const content = textEncoder.encode(
    `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`,
  );
  pdf.writeObject(CONTENT, `<< /Length ${content.length} >>`, content);

  const imageStream = deflate(rgb);
  pdf.writeObject(
    IMAGE,
    `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${
      image.height
    } /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${
      alpha ? ` /SMask ${ALPHA_MASK} 0 R` : ""
    } /Length ${imageStream.length} >>`,
    imageStream,
  );

  pdf.writeObject(
    INFO,
    `<< /Producer ${toPdfTextString("SketchSync")}${
      title ? ` /Title ${toPdfTextString(title)}` : ""
    } >>`,
  );

  if (alpha) {
    const alphaStream = deflate(alpha);
    pdf.writeObject(
      ALPHA_MASK,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${alphaStream.length} >>`,
      alphaStream,
    );
  }

  return pdf.finish(`/Root ${CATALOG} 0 R /Info ${INFO} 0 R`);
};

export const exportToPdf = async ({
  data,
  config,
  title,
}: {
  data: ExportSceneData;
  config: ExportSceneConfig & { scale?: number };
  title?: string;
}) => {
  const preferredScale = config.scale ?? 1;
  const drawingSize = { width: 0, height: 0 };

  const canvas = await exportScene({
    type: "canvas",
    data,
    config: {
      ...config,
      scale: (width, height) => {
        drawingSize.width = width;
        drawingSize.height = height;
        return getPdfPixelRatio(width, height, preferredScale);
      },
    },
  });

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Couldn't read the rendered drawing for the PDF");
  }
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const page = getPdfPageSize(drawingSize.width, drawingSize.height);

  return new Blob([encodeImageAsPdf(image, page, { title })], {
    type: MIME_TYPES.pdf,
  });
};
