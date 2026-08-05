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
    {
      perDiemCode: "AT",
      perDiemFullDay: 49,
      perDiemPartialDay: 32,
      perDiemOvernight: 116
    },
    DEFAULT_PER_DIEM_RATES
  );

  assert.equal(rate.label, "Österreich");
  assert.equal(rate.fullDay, 49);
  assert.equal(rate.partialDay, 32);
  assert.equal(rate.overnight, 116);
});

test("verwendet für Dublin den landesweiten Satz für Irland", () => {
  const rate = resolvePerDiemRate("IE", "Dublin", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "IE");
  assert.equal(rate.fullDay, 64);
  assert.equal(rate.partialDay, 43);
  assert.equal(rate.overnight, 164);
});

test("erkennt Rio de Janeiro als brasilianischen Ortssatz", () => {
  const rate = resolvePerDiemRate("BR", "Kundentermin Rio de Janeiro", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "BR_RIO");
  assert.equal(rate.fullDay, 69);
  assert.equal(rate.overnight, 140);
});

test("erkennt Mumbai als indischen Ortssatz", () => {
  const rate = resolvePerDiemRate("IN", "Mumbai", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.code, "IN_MUMBAI");
  assert.equal(rate.fullDay, 53);
  assert.equal(rate.overnight, 218);
});

test("erkennt Madrid und verwendet sonst den spanischen Basissatz", () => {
  assert.equal(resolvePerDiemRate("ES", "Madrid", DEFAULT_PER_DIEM_RATES).code, "ES_MADRID");
  assert.equal(resolvePerDiemRate("ES", "Valencia", DEFAULT_PER_DIEM_RATES).code, "ES");
});

test("nutzt für ein anderes Land den amtlichen Luxemburg-Satz", () => {
  const rate = resolvePerDiemRate("OTHER", "Beliebiger Ort", DEFAULT_PER_DIEM_RATES);
  assert.equal(rate.fullDay, 63);
  assert.equal(rate.partialDay, 42);
  assert.equal(rate.overnight, 139);
});

test("enthält eindeutige Satzcodes und einen Basissatz für jede Ortsausnahme", () => {
  const codes = DEFAULT_PER_DIEM_RATES.map(rate => rate.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const regionalRate of DEFAULT_PER_DIEM_RATES.filter(rate => rate.code !== rate.countryCode)) {
    assert.ok(DEFAULT_PER_DIEM_RATES.some(rate => rate.code === regionalRate.countryCode));
    assert.ok(regionalRate.destinationPattern);
  }
});
