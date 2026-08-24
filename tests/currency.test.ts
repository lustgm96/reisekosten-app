import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrencyAmount, isValidCurrencyCode, toEur } from "../src/lib/currency.ts";

test("rechnet Fremdwährungsbeträge mit dem Wechselkurs in Euro um", () => {
  assert.equal(toEur(100, 0.92), 92);
  assert.equal(toEur(50), 50);
});

test("erkennt gültige und ungültige Währungscodes", () => {
  assert.equal(isValidCurrencyCode("USD"), true);
  assert.equal(isValidCurrencyCode("us"), false);
  assert.equal(isValidCurrencyCode("US"), false);
});

test("formatiert Beträge in der jeweiligen Währung und fällt bei ungültigen Codes auf EUR zurück", () => {
  assert.match(formatCurrencyAmount(10, "USD"), /\$|USD/);
  assert.match(formatCurrencyAmount(10, "invalid"), /€/);
});
