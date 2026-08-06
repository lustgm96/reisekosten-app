import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTransportSelection,
  isValidTransportSelection,
  parseTransportSelection,
  serializeTransportSelection
} from "../src/lib/transport.ts";

test("speichert und liest mehrere Verkehrsmittel mit Hinweis", () => {
  const value = serializeTransportSelection({
    types: ["Firmenwagen", "Flug", "Mietwagen"],
    notes: " Firmenwagen zum Flughafen, vor Ort Mietwagen "
  });

  assert.deepEqual(parseTransportSelection(value), {
    types: ["Firmenwagen", "Flug", "Mietwagen"],
    notes: "Firmenwagen zum Flughafen, vor Ort Mietwagen"
  });
  assert.equal(formatTransportSelection(value), "Firmenwagen, Flug, Mietwagen – Firmenwagen zum Flughafen, vor Ort Mietwagen");
});

test("liest bisherige Klartextwerte weiterhin", () => {
  assert.deepEqual(parseTransportSelection("Privater Pkw"), {
    types: ["Privat-Pkw"],
    notes: ""
  });
  assert.deepEqual(parseTransportSelection("Fähre"), {
    types: ["Sonstiges"],
    notes: "Fähre"
  });
});

test("verlangt mindestens ein Verkehrsmittel", () => {
  assert.equal(isValidTransportSelection('{"types":[],"notes":""}'), false);
  assert.equal(isValidTransportSelection('{"types":["Bahn"],"notes":""}'), true);
});
