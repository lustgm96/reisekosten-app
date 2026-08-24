import assert from "node:assert/strict";
import test from "node:test";
import { getCompletionError, isItemDocumented, undocumentedItemCount } from "../src/lib/card-statement-workflow.ts";

test("eine hochgeladene Position gilt als belegt", () => {
  assert.equal(isItemDocumented({ receiptType: "UPLOADED", receiptStoredFileName: "abc.png", selfDeclaration: null }), true);
});

test("eine hochgeladene Position ohne Datei gilt nicht als belegt", () => {
  assert.equal(isItemDocumented({ receiptType: "UPLOADED", receiptStoredFileName: null, selfDeclaration: null }), false);
});

test("eine Eigenbeleg-Position braucht ein generiertes PDF", () => {
  assert.equal(isItemDocumented({ receiptType: "SELF_DECLARATION", receiptStoredFileName: null, selfDeclaration: { generatedPdfFileName: null } }), false);
  assert.equal(isItemDocumented({ receiptType: "SELF_DECLARATION", receiptStoredFileName: null, selfDeclaration: { generatedPdfFileName: "declaration.pdf" } }), true);
});

test("zaehlt unbelegte Positionen", () => {
  const items = [
    { receiptType: "UPLOADED" as const, receiptStoredFileName: "a.png", selfDeclaration: null },
    { receiptType: "UPLOADED" as const, receiptStoredFileName: null, selfDeclaration: null }
  ];
  assert.equal(undocumentedItemCount(items), 1);
});

test("Abschluss ist erst moeglich wenn alle Positionen belegt sind", () => {
  const documented = [{ receiptType: "UPLOADED" as const, receiptStoredFileName: "a.png", selfDeclaration: null }];
  assert.equal(getCompletionError(documented), null);

  const undocumented = [{ receiptType: "UPLOADED" as const, receiptStoredFileName: null, selfDeclaration: null }];
  assert.match(getCompletionError(undocumented) ?? "", /noch keinen Beleg/);

  assert.match(getCompletionError([]) ?? "", /mindestens eine Position/);
});
