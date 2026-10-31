# Export: PNG, SVG and PDF

Open **Main menu → Export image** (or **Ctrl+Shift+E**, **Cmd+Shift+E** on a Mac). The dialog shows a preview and these options, which apply to every format:

| Option | What it does |
| --- | --- |
| Only selected | Export just the selection (shown only when something is selected). Selecting a single frame exports exactly that frame, clipped to its edges. |
| Background | Off gives a transparent background. |
| Dark mode | Exports with the dark colours. |
| Embed scene | Hides the board inside a PNG or SVG so it can be opened in SketchSync again. Not used for PDF. |
| Scale | 1×, 2× or 3×: how many pixels per drawing pixel. |
| File name | The box under the preview (in browsers without a save dialog), otherwise the save dialog. |

There's a 10 px margin around the drawing (none when exporting a frame).

## Which format to pick

| Format | Use it for | Kind |
| --- | --- | --- |
| PNG | Chat, slides, documents, anything that takes a picture. Also **Copy to clipboard**. | Pixels |
| SVG | Websites, editing in Figma or Inkscape, zooming in forever. | Vector (shapes and text stay shapes and text) |
| PDF | Printing, handing in, attaching to an email. One page, sized to the drawing. | Pixels inside a PDF page |

PDF is also in the command palette (**Ctrl+/** or **Cmd+/**, type "pdf"). It exports the selection if there is one, otherwise the whole board, with the settings you last used in the dialog.

## How PDF export works

1. The drawing is rendered with `exportToCanvas`, the same renderer as PNG and the board itself, using the dialog's options (background, dark mode, selection, frame, margin).
2. The page is the size of the drawing. One drawing pixel is 1/96 inch, so a 960 × 480 px drawing gives a 10 × 5 inch page.
3. The image inside is rendered at **max(scale, 2)** pixels per drawing pixel: 1× and 2× give 192 DPI on paper, 3× gives 288 DPI. The minimum of 2 is there so the default prints sharply.
4. Our own small PDF writer (`packages/editor/data/pdf.ts`, about 240 lines) puts the pixels on the page. The colours are compressed losslessly (Flate, through `pako`, which SketchSync already uses). With **Background** off, transparency is stored as a separate mask, so the page really is transparent.
5. The PDF code is loaded only when someone exports a PDF (`import("./pdf")`). It adds no dependency and is about 3 KB minified (1.6 KB gzipped) in its own chunk.

## Why pixels and not a vector PDF

We looked at making a vector PDF, but the fonts make that a bad deal:

- SketchSync text uses the editor's bundled fonts (Sketchfont, Nunito, Lilita One, Comic Shanns and others), shipped as `woff2` web fonts. Our SVG export embeds them with `@font-face`.
- SVG-to-PDF tools (jsPDF with svg2pdf, PDFKit, printing the SVG) can't use those `woff2` fonts. They fall back to Helvetica or Times, so the hand-drawn look is lost. Doing it properly means unpacking each font, cutting it down to the characters used, and embedding it: a lot of code and download size for one button.
- Rendering to pixels uses exactly the code that draws the board, so fonts, images, dark mode, frame clipping and arrows look the same as on screen.
- jsPDF would have added a few hundred KB (even if loaded lazily). Our writer is about 3 KB.
- We use lossless compression, not JPEG, so lines and text don't get blurry halos.

## "Crisp at any resolution", honestly

- **SVG** is the only format that stays sharp at any zoom, because it stores shapes, not pixels. If you need to zoom in forever or edit the drawing, use SVG.
- **PNG and PDF** are pixels. They're as sharp as the scale you pick: at 3× a PDF has 288 DPI at its real size, which is sharp on paper and on high-density screens. Zoom a PDF viewer far past 300% and you'll start to see pixels.
- So "any resolution" in SketchSync means you choose the resolution you need (1×, 2×, 3×), and PDF never goes below 192 DPI.

## Limits

- PDF text can't be selected or searched; it's part of the picture.
- Very large boards: the PDF image is capped at about 16.7 million pixels (4096 × 4096) so every browser, iPhones included, can render it. Bigger drawings automatically get a lower DPI. For a huge board, export a frame or a selection, or use SVG.
- Pages larger than 200 inches (Acrobat's limit) are scaled down to fit.
- Embedded websites (YouTube and so on) show as placeholders, the same as in PNG.
- File size depends on the scale: our small test diagrams were 12 to 47 KB.

## Where the code is

| File | What |
| --- | --- |
| `packages/editor/data/pdf.ts` | PDF writer, page size and DPI rules, `exportToPdf` |
| `packages/editor/data/index.ts` | `exportCanvas` sends `"pdf"` to the lazy PDF chunk and the save dialog |
| `packages/editor/components/ImageExportDialog.tsx` | The PDF button |
| `packages/editor/actions/actionExport.tsx` | "Export to PDF" command (`exportToPdf` action) |
| `packages/editor/tests/pdfExport.test.ts` | Tests: valid PDF, page size, scale, transparency, file name |
