import assert from "node:assert/strict";
import test from "node:test";
import { formatProcessNumber, receiptDocumentTitle } from "../src/lib/process-number.ts";

test("formatiert fortlaufende Vorgangsnummern", () => {
  assert.equal(formatProcessNumber(2026, 1), "RK-2026-0001");
  assert.equal(formatProcessNumber(2026, 12345), "RK-2026-12345");
});

test("beschriftet Belege mit Vorgang, Nummer und Upload-Datum", () => {
  assert.equal(
    receiptDocumentTitle("RK-2026-0007", new Date("2026-08-05T10:00:00"), 2),
    "RK-2026-0007 · Beleg 03 · Upload 05.08.2026"
  );
});
