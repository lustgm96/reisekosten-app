import assert from "node:assert/strict";
import test from "node:test";
import { dateInputValue, dateTimeLocalInputValue } from "../src/lib/date-input.ts";

test("formatiert Datumswerte für HTML-Eingabefelder in lokaler Zeit", () => {
  const value = new Date(2026, 2, 4, 7, 5, 59);
  assert.equal(dateInputValue(value), "2026-03-04");
  assert.equal(dateTimeLocalInputValue(value), "2026-03-04T07:05");
});
