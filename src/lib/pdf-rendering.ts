import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

const MAX_OCR_PAGES = 3;
const RENDER_SCALE = 2;

Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });

export async function renderPdfForOcr(pdf: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdf),
    disableFontFace: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;

  try {
    const pageCount = Math.min(document.numPages, MAX_OCR_PAGES);
    const images: Buffer[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas: canvas as never,
        canvasContext: context as never,
        viewport
      }).promise;
      images.push(canvas.toBuffer("image/png"));
      page.cleanup();
    }

    return { images, pageCount: document.numPages };
  } finally {
    await loadingTask.destroy();
  }
}
