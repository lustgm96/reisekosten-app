import assert from "node:assert/strict";
import test from "node:test";
import { getAdminChangeError } from "../src/lib/user-policy.ts";

const change = (overrides: Partial<Parameters<typeof getAdminChangeError>[0]> = {}) => ({
  activeAdminCount: 2,
  actorId: "admin-1",
  nextActive: true,
  nextRole: "ADMIN" as const,
  targetActive: true,
  targetId: "admin-2",
  targetRole: "ADMIN" as const,
  ...overrides
});

test("verhindert das Deaktivieren des eigenen Adminzugangs", () => {
  const error = getAdminChangeError(change({
    actorId: "admin-1",
    nextActive: false,
    targetId: "admin-1"
  }));
  assert.match(error ?? "", /eigene Adminzugang/);
});

test("verhindert das Herabstufen des eigenen Adminzugangs", () => {
  const error = getAdminChangeError(change({
    actorId: "admin-1",
    nextRole: "EMPLOYEE",
    targetId: "admin-1"
  }));
  assert.match(error ?? "", /eigene Adminzugang/);
});

test("erhält mindestens einen aktiven Admin", () => {
  const error = getAdminChangeError(change({
    activeAdminCount: 1,
    nextRole: "APPROVER"
  }));
  assert.match(error ?? "", /Mindestens ein aktiver Admin/);
});

test("erlaubt das Herabstufen bei einem weiteren aktiven Admin", () => {
  const error = getAdminChangeError(change({
    activeAdminCount: 2,
    nextRole: "APPROVER"
  }));
  assert.equal(error, null);
});

test("behandelt das Bearbeiten eines bereits inaktiven Admins nicht als Verlust", () => {
  const error = getAdminChangeError(change({
    activeAdminCount: 1,
    nextActive: false,
    targetActive: false
  }));
  assert.equal(error, null);
});
