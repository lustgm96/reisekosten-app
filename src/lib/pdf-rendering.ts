import { createCanvas, DOMMatrix, ImageData, Path2D, type Canvas } from "@napi-rs/canvas";

const MAX_OCR_PAGES = 3;
const PRIMARY_RENDER_SCALE = 2;
const DETAIL_RENDER_SCALE = 3;
const CONTENT_THRESHOLD = 220;
const CONTENT_PADDING = 24;
const TARGET_CONTENT_WIDTH = 1600;
const MAX_CONTENT_HEIGHT = 2800;

Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });

function cropAndScaleForOcr(canvas: Canvas): Canvas {
  const context = canvas.getContext("2d");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width;
  let right = 0;
  let top = canvas.height;
  let bottom = 0;

  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const offset = (y * canvas.width + x) * 4;
      if (
        pixels[offset] < CONTENT_THRESHOLD ||
        pixels[offset + 1] < CONTENT_THRESHOLD ||
        pixels[offset + 2] < CONTENT_THRESHOLD
      ) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right <= left || bottom <= top) return canvas;
  left = Math.max(0, left - CONTENT_PADDING);
  top = Math.max(0, top - CONTENT_PADDING);
  right = Math.min(canvas.width, right + CONTENT_PADDING);
  bottom = Math.min(canvas.height, bottom + CONTENT_PADDING);
  const width = right - left;
  const height = bottom - top;
  const scale = Math.min(3, TARGET_CONTENT_WIDTH / width, MAX_CONTENT_HEIGHT / height);
  if (scale <= 1.05 && width > canvas.width * .92 && height > canvas.height * .92) return canvas;

  const result = createCanvas(Math.round(width * Math.max(1, scale)), Math.round(height * Math.max(1, scale)));
  const resultContext = result.getContext("2d");
  resultContext.fillStyle = "#ffffff";
  resultContext.fillRect(0, 0, result.width, result.height);
  resultContext.drawImage(canvas, left, top, width, height, 0, 0, result.width, result.height);
  return result;
}

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
    const detailImages: Buffer[] = [];
    const fallbackImages: Buffer[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const renderPage = async (scale: number) => {
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvas: canvas as never,
          canvasContext: context as never,
          viewport
        }).promise;
        return canvas;
      };
      const primaryCanvas = await renderPage(PRIMARY_RENDER_SCALE);
      const detailCanvas = await renderPage(DETAIL_RENDER_SCALE);
      images.push(primaryCanvas.toBuffer("image/png"));
      detailImages.push(cropAndScaleForOcr(primaryCanvas).toBuffer("image/png"));
      fallbackImages.push(cropAndScaleForOcr(detailCanvas).toBuffer("image/png"));
      page.cleanup();
    }

    return { images, detailImages, fallbackImages, pageCount: document.numPages };
  } finally {
    await loadingTask.destroy();
  }
}
