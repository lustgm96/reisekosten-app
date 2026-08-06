import assert from "node:assert/strict";
import test from "node:test";
import { entryFromSuggestion, missingReceiptFields } from "../src/lib/receipt-entry.ts";

test("überführt Erkennungsergebnisse in editierbare Belegwerte", () => {
  const file = new File(["receipt"], "beleg.pdf", { type: "application/pdf" });
  const entry = entryFromSuggestion(file, 2, {
    amount: 12.5,
    category: "Taxi",
    confidence: 91,
    description: "Taxi Dublin",
    documentType: "RECEIPT",
    expenseDate: "2026-08-05",
    vatAmount: 2,
    warnings: []
  });

  assert.equal(entry.fileIndex, 2);
  assert.equal(entry.amount, "12.50");
  assert.equal(entry.vatAmount, "2.00");
  assert.deepEqual(missingReceiptFields(entry), []);
});

test("nennt alle fehlenden Pflichtwerte eines Belegs", () => {
  const file = new File(["receipt"], "beleg.pdf", { type: "application/pdf" });
  const entry = entryFromSuggestion(file, 0, {
    amount: null,
    category: "Sonstiges",
    confidence: 0,
    description: "Beleg",
    documentType: "RECEIPT",
    expenseDate: null,
    vatAmount: null,
    warnings: []
  });
  assert.deepEqual(missingReceiptFields(entry), ["Datum", "Beschreibung", "Gesamtbetrag"]);
});
