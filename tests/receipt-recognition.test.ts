import assert from "node:assert/strict";
import test from "node:test";
import { extractCardStatementItems, extractReceiptSuggestion } from "../src/lib/receipt-recognition.ts";

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
  assert.equal(result.vat19Amount, 3.8);
  assert.equal(result.vat7Amount, null);
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

test("erkennt Kreditkartenabrechnungen und übernimmt keinen Gesamtsaldo", () => {
  const result = extractReceiptSuggestion(`
    Abrechnung Business Card Premium (Kreditkarte)
    Verfügungsrahmen 5000 EUR
    Umsatzdatum Buchungsdatum Zahlungsempfänger Betrag/EUR
    Abrechnungssaldo vom 2.5.2026 -1.758,58
  `, 90);
  assert.equal(result.documentType, "CARD_STATEMENT");
  assert.equal(result.amount, null);
  assert.ok(result.warnings.some(warning => warning.includes("Kreditkartenabrechnung")));
});

test("blockiert offensichtlich unplausible OCR-Beträge", () => {
  const result = extractReceiptSuggestion(
    "Flughafen Düsseldorf\nBetrag EUR 28705,26\n28.05.2026",
    80
  );
  assert.equal(result.amount, null);
  assert.ok(result.warnings.some(warning => warning.includes("unplausibel")));
});

test("erkennt englische Datums- und Währungsformate", () => {
  const result = extractReceiptSuggestion("Clayton Hotels\n26 May '26\nPayment Due €47.60", 85);
  assert.equal(result.expenseDate, "2026-05-26");
  assert.equal(result.amount, 47.6);
});

test("interpretiert US-Tausender- und Dezimaltrennzeichen", () => {
  const result = extractReceiptSuggestion("Invoice\nTotal EUR 1,758.58\n28.05.2026", 85);
  assert.equal(result.amount, 1758.58);
});

test("erkennt OCR-Daten mit Leerzeichen und Komma als Trenner", () => {
  const result = extractReceiptSuggestion("star Tankstelle\nDatum 13, 05, 2026\nTOTAL 99,79 EUR");
  assert.equal(result.expenseDate, "2026-05-13");
  assert.equal(result.amount, 99.79);
});

test("erkennt englische Steuerangaben und bevorzugt den Steuerbetrag", () => {
  const result = extractReceiptSuggestion(`
    Clayton Hotel
    27 May 2026
    VAT @ 13.5% 333.04 44.96 EUR
    Total incl. VAT 378.00 EUR
  `);
  assert.equal(result.vat19Amount, 44.96);
  assert.equal(result.amount, 378);
});

test("extrahiert Einzelpositionen aus einer Kreditkartenabrechnung", () => {
  const items = extractCardStatementItems(`
    Kreditkartenabrechnung Business Card Premium
    Umsatzdatum Buchungsdatum Zahlungsempfänger Betrag/EUR
    01.05.2026 02.05.2026 Shell Tankstelle Köln 65,20
    03.05.2026 04.05.2026 Deutsche Bahn Ticket 89,00
    Verfügungsrahmen 5000 EUR
    Abrechnungssaldo vom 2.5.2026 -1.758,58
  `);
  assert.equal(items.length, 2);
  assert.equal(items[0].transactionDate, "2026-05-01");
  assert.equal(items[0].amount, 65.2);
  assert.match(items[0].description, /Shell Tankstelle/);
  assert.equal(items[1].amount, 89);
});
