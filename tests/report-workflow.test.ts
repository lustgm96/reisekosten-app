import assert from "node:assert/strict";
import test from "node:test";
import { getCompletionError } from "../src/lib/report-workflow.ts";

test("erlaubt Admins, freigegebene Abrechnungen abzuschließen", () => {
  assert.equal(getCompletionError("ADMIN", "APPROVED"), null);
});

test("verhindert den Abschluss durch Prüfer", () => {
  assert.match(getCompletionError("APPROVER", "APPROVED") ?? "", /Nur Admins/);
});

test("verhindert den Abschluss noch nicht freigegebener Abrechnungen", () => {
  assert.match(getCompletionError("ADMIN", "SUBMITTED") ?? "", /Nur freigegebene/);
});

test("verhindert einen erneuten Abschluss", () => {
  assert.match(getCompletionError("ADMIN", "COMPLETED") ?? "", /Nur freigegebene/);
});
