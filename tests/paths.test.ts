import assert from "node:assert/strict";
import test from "node:test";
import { basePath, withBasePath } from "../src/lib/paths.ts";

test("verwendet den Plattformpfad als Standard", () => {
  assert.equal(basePath, "/Reisekosten");
});

test("setzt den Plattformpfad vor interne Ziele", () => {
  assert.equal(withBasePath("/login"), "/Reisekosten/login");
  assert.equal(withBasePath("/api/files/123"), "/Reisekosten/api/files/123");
});

test("bildet die Startseite ohne abschließenden Doppel-Slash", () => {
  assert.equal(withBasePath("/"), "/Reisekosten");
});

test("lehnt relative Pfade ab", () => {
  assert.throws(() => withBasePath("login"), /mit \//);
});
