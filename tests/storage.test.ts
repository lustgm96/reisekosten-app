import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_RECEIPT_BYTES,
  ReceiptFileError,
  validateReceiptFile
} from "../src/lib/storage.ts";

test("akzeptiert unterstützte Bildbelege und PDF für die Ablage", () => {
  const image = new File(["beleg"], "beleg.jpg", { type: "image/jpeg" });
  const pdf = new File(["beleg"], "beleg.pdf", { type: "application/pdf" });

  assert.doesNotThrow(() => validateReceiptFile(image));
  assert.doesNotThrow(() => validateReceiptFile(pdf));
});

test("lehnt PDF nur für die automatische Erkennung ab", () => {
  const pdf = new File(["beleg"], "beleg.pdf", { type: "application/pdf" });

  assert.throws(
    () => validateReceiptFile(pdf, true),
    (error: unknown) =>
      error instanceof ReceiptFileError &&
      error.status === 415 &&
      error.message.includes("PDF")
  );
});

test("lehnt leere und zu große Belege mit passendem Status ab", () => {
  const empty = new File([], "leer.jpg", { type: "image/jpeg" });
  const oversized = new File(
    [new Uint8Array(MAX_RECEIPT_BYTES + 1)],
    "gross.jpg",
    { type: "image/jpeg" }
  );

  assert.throws(
    () => validateReceiptFile(empty),
    (error: unknown) => error instanceof ReceiptFileError && error.status === 400
  );
  assert.throws(
    () => validateReceiptFile(oversized),
    (error: unknown) => error instanceof ReceiptFileError && error.status === 413
  );
});
