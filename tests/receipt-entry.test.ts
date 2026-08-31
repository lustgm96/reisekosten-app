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
    vat7Amount: null,
    vat19Amount: 2,
    warnings: []
  });

  assert.equal(entry.fileIndex, 2);
  assert.equal(entry.amount, "12.50");
  assert.equal(entry.vat19Amount, "2.00");
  assert.equal(entry.netAmount, "10.50");
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
    vat7Amount: null,
    vat19Amount: null,
    warnings: []
  });
  assert.deepEqual(missingReceiptFields(entry), ["Datum", "Beschreibung", "Gesamtbetrag"]);
});

test("verlangt Kunde, Teilnehmer und Anlass bei Bewirtungsbelegen", () => {
  const file = new File(["receipt"], "essen.pdf", { type: "application/pdf" });
  const entry = entryFromSuggestion(file, 0, {
    amount: 45,
    category: "Bewirtung",
    confidence: 80,
    description: "Geschäftsessen",
    documentType: "RECEIPT",
    expenseDate: "2026-08-05",
    vat7Amount: null,
    vat19Amount: 5,
    warnings: []
  });

  assert.deepEqual(missingReceiptFields(entry), ["Bewirteter Kunde", "Teilnehmende Personen", "Anlass der Bewirtung"]);
  entry.bewirtungKunde = "Musterfirma GmbH";
  entry.bewirtungTeilnehmer = "Max Mustermann";
  entry.bewirtungAnlass = "Vertragsverhandlung";
  assert.deepEqual(missingReceiptFields(entry), []);
});
