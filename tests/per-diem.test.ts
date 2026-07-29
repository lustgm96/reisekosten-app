import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PER_DIEM_RATES,
  resolvePerDiemRate,
  storedPerDiemRate
} from "../src/lib/per-diem.ts";

test("wählt Österreich anhand des Reiselandes", () => {
  const rate = resolvePerDiemRate("AT", "Wien", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "AT");
  assert.equal(rate.fullDay, 50);
  assert.equal(rate.partialDay, 33);
});

test("erkennt den besonderen Satz für Bern automatisch", () => {
  const rate = resolvePerDiemRate("CH", "Kundentermin in Bern", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "CH_BERN");
  assert.equal(rate.fullDay, 82);
  assert.equal(rate.partialDay, 55);
});

test("verwendet für andere Schweizer Orte den allgemeinen Satz", () => {
  const rate = resolvePerDiemRate("CH", "Zürich", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "CH");
  assert.equal(rate.fullDay, 70);
  assert.equal(rate.partialDay, 47);
});

test("behält den in einer Abrechnung gespeicherten Satz bei", () => {
  const rate = storedPerDiemRate(
    { perDiemCode: "AT", perDiemFullDay: 49, perDiemPartialDay: 32 },
    DEFAULT_PER_DIEM_RATES
  );

  assert.equal(rate.label, "Österreich");
  assert.equal(rate.fullDay, 49);
  assert.equal(rate.partialDay, 32);
});
