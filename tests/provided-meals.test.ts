import assert from "node:assert/strict";
import test from "node:test";
import { countProvidedMeals, travelDateKeys, validateProvidedMeals } from "../src/lib/provided-meals.ts";

test("erstellt jeden Reisetag genau einmal", () => {
  assert.deepEqual(
    travelDateKeys(new Date("2026-08-05T08:00:00"), new Date("2026-08-07T18:00:00")),
    ["2026-08-05", "2026-08-06", "2026-08-07"]
  );
});

test("zählt gestellte Mahlzeiten für die Pauschalen", () => {
  const values = validateProvidedMeals(
    ["2026-08-05:BREAKFAST", "2026-08-06:LUNCH", "2026-08-06:DINNER"],
    new Date("2026-08-05"),
    new Date("2026-08-06")
  );
  assert.deepEqual(countProvidedMeals(values), { breakfasts: 1, lunches: 1, dinners: 1 });
});

test("lehnt Mahlzeiten außerhalb der Reise ab", () => {
  assert.throws(() => validateProvidedMeals(
    ["2026-08-07:BREAKFAST"],
    new Date("2026-08-05"),
    new Date("2026-08-06")
  ));
});
