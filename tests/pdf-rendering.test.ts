import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { renderPdfForOcr } from "../src/lib/pdf-rendering.ts";
import {
  recognizeReceiptPages,
  terminateReceiptWorker
} from "../src/lib/receipt-recognition.ts";

test("rendert einen PDF-Beleg lokal als PNG für die OCR", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([500, 300]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("Muster Restaurant GmbH", { x: 30, y: 230, font, size: 24 });
  page.drawText("Datum 28.07.2026", { x: 30, y: 175, font, size: 22 });
  page.drawText("GESAMT 23,80", { x: 30, y: 105, font, size: 36 });

  const result = await renderPdfForOcr(Buffer.from(await document.save()));

  assert.equal(result.pageCount, 1);
  assert.equal(result.images.length, 1);
  assert.equal(result.detailImages.length, 1);
  assert.equal(result.fallbackImages.length, 1);
  assert.deepEqual([...result.images[0].subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  try {
    const suggestion = await recognizeReceiptPages(result.images, result.detailImages, result.fallbackImages);
    assert.equal(suggestion.amount, 23.8);
    assert.equal(suggestion.expenseDate, "2026-07-28");
  } finally {
    await terminateReceiptWorker();
  }
});
