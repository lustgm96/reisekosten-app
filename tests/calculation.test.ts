import assert from "node:assert/strict";
import test from "node:test";
import { calculateReport, type NumericSettings } from "../src/lib/calculation.ts";

const settings: NumericSettings = {
  breakfastDeduction: 5.6,
  dinnerDeduction: 11.2,
  lunchDeduction: 11.2,
  mealArrivalDeparture: 14,
  mealFullDay: 28,
  mileageRate: 0.3
};

const report = (overrides: Record<string, unknown> = {}) => ({
  accommodationMode: "ACTUAL" as const,
  breakfasts: 0,
  dinners: 0,
  endAt: new Date(2026, 6, 6, 18, 0),
  lunches: 0,
  privateKilometers: 0,
  perDiemOvernight: 20,
  startAt: new Date(2026, 6, 6, 9, 0),
  ...overrides
});

test("berechnet die Übernachtungspauschale nur bei ausdrücklicher Auswahl", () => {
  const result = calculateReport(
    report({
      accommodationMode: "PER_DIEM",
      startAt: new Date(2026, 6, 6, 9, 0),
      endAt: new Date(2026, 6, 8, 18, 0),
      perDiemOvernight: 117
    }),
    [],
    settings
  );

  assert.equal(result.nights, 2);
  assert.equal(result.lodgingAllowance, 234);
  assert.equal(result.reimbursement, result.mealAllowance + 234);
});

test("gewährt bei exakt acht Stunden keine Pauschale", () => {
  const result = calculateReport(
    report({ endAt: new Date(2026, 6, 6, 17, 0) }),
    [],
    settings
  );
  assert.equal(result.mealAllowance, 0);
});

test("gewährt bei mehr als acht Stunden die Tagespauschale", () => {
  const result = calculateReport(
    report({ endAt: new Date(2026, 6, 6, 17, 1) }),
    [],
    settings
  );
  assert.equal(result.mealAllowance, 14);
});

test("berechnet Anreise, vollen Tag und Abreise korrekt", () => {
  const result = calculateReport(
    report({
      startAt: new Date(2026, 6, 6, 6, 0),
      endAt: new Date(2026, 6, 8, 18, 0)
    }),
    [],
    settings
  );
  assert.equal(result.days, 3);
  assert.equal(result.mealBase, 56);
});

test("kürzt Mahlzeiten höchstens bis auf null", () => {
  const result = calculateReport(
    report({ breakfasts: 2, lunches: 2, dinners: 2 }),
    [],
    settings
  );
  assert.equal(result.mealDeductions, 14);
  assert.equal(result.mealAllowance, 0);
});

test("rundet Kilometer und Ausgaben auf Cent", () => {
  const result = calculateReport(
    report({ privateKilometers: 7 }),
    [
      { amount: 10.005, paymentType: "PRIVATE" },
      { amount: 2.1, paymentType: "CASH" },
      { amount: 20, paymentType: "COMPANY_CARD" }
    ],
    settings
  );
  assert.equal(result.mileage, 2.1);
  assert.equal(result.privateExpenses, 10.01);
  assert.equal(result.reimbursement, 28.21);
  assert.equal(result.totalCosts, 48.21);
});

test("zählt Kalendertage unabhängig von Sommerzeitlängen", () => {
  const result = calculateReport(
    report({
      startAt: new Date(2026, 2, 28, 10, 0),
      endAt: new Date(2026, 2, 30, 10, 0)
    }),
    [],
    settings
  );
  assert.equal(result.days, 3);
});

test("verwendet ausländische Pauschalen und prozentuale Mahlzeitenkürzungen", () => {
  const result = calculateReport(
    report({
      startAt: new Date("2026-07-01T08:00:00"),
      endAt: new Date("2026-07-03T18:00:00"),
      breakfasts: 1,
      lunches: 1
    }),
    [],
    settings,
    { fullDay: 50, partialDay: 33 }
  );

  assert.equal(result.mealBase, 116);
  assert.equal(result.mealDeductions, 30);
  assert.equal(result.mealAllowance, 86);
});
