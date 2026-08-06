import assert from "node:assert/strict";
import test from "node:test";
import {
  expenseSchema,
  passwordSchema,
  reportSchema,
  userSchema
} from "../src/lib/validation.ts";

const validReport = {
  breakfasts: 0,
  destination: "Hamburg",
  dinners: 0,
  endAt: "2026-07-08T18:00",
  lunches: 0,
  privateKilometers: 42,
  purpose: "Kundentermin",
  startAt: "2026-07-08T08:00",
  title: "Kundenbesuch",
  transportType: "Privater Pkw"
};

test("akzeptiert eine vollständige Abrechnung", () => {
  const result = reportSchema.safeParse(validReport);
  assert.equal(result.success, true);
});

test("verhindert ein Reiseende vor dem Reisebeginn", () => {
  const result = reportSchema.safeParse({
    ...validReport,
    endAt: "2026-07-08T07:59"
  });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues[0]?.path[0], "endAt");
});

test("verhindert negative Kilometer", () => {
  const result = reportSchema.safeParse({ ...validReport, privateKilometers: -1 });
  assert.equal(result.success, false);
});

test("akzeptiert mehrere Verkehrsmittel und lehnt eine leere Auswahl ab", () => {
  const multiple = JSON.stringify({ types: ["Firmenwagen", "Flug", "Mietwagen"], notes: "Mietwagen vor Ort" });
  assert.equal(reportSchema.safeParse({ ...validReport, transportType: multiple }).success, true);
  assert.equal(reportSchema.safeParse({ ...validReport, transportType: '{"types":[],"notes":""}' }).success, false);
});

test("akzeptiert nur positive Ausgabenbeträge", () => {
  const baseExpense = {
    amount: 12.5,
    category: "Parken",
    description: "Parkhaus",
    expenseDate: "2026-07-08",
    paymentType: "PRIVATE",
    vatAmount: 1.99
  };
  assert.equal(expenseSchema.safeParse(baseExpense).success, true);
  assert.equal(expenseSchema.safeParse({ ...baseExpense, amount: 0 }).success, false);
});

test("normalisiert E-Mail-Adressen und prüft Rollen", () => {
  const result = userSchema.parse({
    email: "  TEST@EXAMPLE.LOCAL ",
    name: "Test Person",
    role: "APPROVER"
  });
  assert.equal(result.email, "test@example.local");
  assert.equal(userSchema.safeParse({ ...result, role: "OWNER" }).success, false);
});

test("verlangt mindestens acht Zeichen für Passwörter", () => {
  assert.equal(passwordSchema.safeParse({ password: "1234567" }).success, false);
  assert.equal(passwordSchema.safeParse({ password: "12345678" }).success, true);
});
