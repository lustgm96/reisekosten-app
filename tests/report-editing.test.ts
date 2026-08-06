import assert from "node:assert/strict";
import test from "node:test";
import { canEmployeeEditReport, isEditableReportStatus } from "../src/lib/report-editing.ts";

test("erlaubt Änderungen nur an Entwürfen und zurückgegebenen Reisen", () => {
  assert.equal(isEditableReportStatus("DRAFT"), true);
  assert.equal(isEditableReportStatus("RETURNED"), true);
  assert.equal(isEditableReportStatus("SUBMITTED"), false);
  assert.equal(isEditableReportStatus("APPROVED"), false);
  assert.equal(isEditableReportStatus("COMPLETED"), false);
});

test("erlaubt Änderungen nur dem zugehörigen Mitarbeiter", () => {
  assert.equal(canEmployeeEditReport("employee-1", "employee-1", "DRAFT"), true);
  assert.equal(canEmployeeEditReport("employee-2", "employee-1", "DRAFT"), false);
});
