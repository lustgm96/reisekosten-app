import assert from "node:assert/strict";
import test from "node:test";
import { extractReceiptSuggestion } from "../src/lib/receipt-recognition.ts";

test("erkennt die wichtigsten Angaben eines deutschen Belegs", () => {
  const result = extractReceiptSuggestion(`
    Muster Restaurant GmbH
    Hauptstraße 12
    28.07.2026 19:42
    Speisen 20,00 EUR
    MwSt 19% 3,80 EUR
    GESAMT 23,80 EUR
  `, 90);

  assert.equal(result.expenseDate, "2026-07-28");
  assert.equal(result.description, "Muster Restaurant GmbH");
  assert.equal(result.category, "Bewirtung");
  assert.equal(result.amount, 23.8);
  assert.equal(result.vatAmount, 3.8);
  assert.deepEqual(result.warnings, []);
});

test("ordnet Tankstellen einer passenden Kategorie zu", () => {
  const result = extractReceiptSuggestion(`
    Shell Station Köln
    Diesel 65,20 EUR
    Summe 65,20 EUR
    27.07.2026
  `);
  assert.equal(result.category, "Tanken");
  assert.equal(result.amount, 65.2);
});

test("meldet unsichere Pflichtangaben zur manuellen Prüfung", () => {
  const result = extractReceiptSuggestion("KASSENBON");
  assert.equal(result.amount, null);
  assert.equal(result.expenseDate, null);
  assert.ok(result.warnings.length >= 2);
});
