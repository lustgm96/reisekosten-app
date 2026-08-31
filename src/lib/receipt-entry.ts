export type ReceiptSuggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  documentType: "RECEIPT" | "CARD_STATEMENT";
  expenseDate: string | null;
  vat7Amount: number | null;
  vat19Amount: number | null;
  warnings: string[];
};

export type ReceiptEntry = {
  amount: string;
  category: string;
  confidence: number;
  currency: string;
  description: string;
  documentType: ReceiptSuggestion["documentType"];
  exchangeRate: string;
  expenseDate: string;
  fileIndex: number;
  fileName: string;
  paymentType: "PRIVATE" | "COMPANY_CARD" | "CASH";
  netAmount: string;
  vat7Amount: string;
  vat19Amount: string;
  tip: string;
  warnings: string[];
  notes: string;
  bewirtungKunde: string;
  bewirtungTeilnehmer: string;
  bewirtungAnlass: string;
};

export const expenseCategories = ["Hotel", "Bewirtung", "Parken", "Taxi", "Bahn", "Flug", "Tanken", "Sonstiges"] as const;

function netAmountFrom(amount: number | null, vat7Amount: number | null, vat19Amount: number | null) {
  if (amount === null) return "";
  const net = amount - (vat7Amount ?? 0) - (vat19Amount ?? 0);
  return Math.max(0, Math.round(net * 100) / 100).toFixed(2);
}

export function entryFromSuggestion(file: File, fileIndex: number, suggestion: ReceiptSuggestion): ReceiptEntry {
  return {
    fileIndex,
    fileName: file.name,
    expenseDate: suggestion.expenseDate ?? "",
    category: suggestion.category || "Sonstiges",
    description: suggestion.description === "Beleg" ? "" : suggestion.description,
    amount: suggestion.amount === null ? "" : suggestion.amount.toFixed(2),
    currency: "EUR",
    exchangeRate: "1",
    netAmount: netAmountFrom(suggestion.amount, suggestion.vat7Amount, suggestion.vat19Amount),
    vat7Amount: suggestion.vat7Amount === null ? "" : suggestion.vat7Amount.toFixed(2),
    vat19Amount: suggestion.vat19Amount === null ? "" : suggestion.vat19Amount.toFixed(2),
    tip: "0",
    paymentType: "PRIVATE",
    confidence: suggestion.confidence,
    documentType: suggestion.documentType,
    warnings: suggestion.warnings,
    notes: "",
    bewirtungKunde: "",
    bewirtungTeilnehmer: "",
    bewirtungAnlass: ""
  };
}

export function failedReceiptEntry(file: File, fileIndex: number, warning: string): ReceiptEntry {
  return {
    fileIndex,
    fileName: file.name,
    expenseDate: "",
    category: "Sonstiges",
    description: "",
    amount: "",
    currency: "EUR",
    exchangeRate: "1",
    netAmount: "",
    vat7Amount: "",
    vat19Amount: "",
    tip: "0",
    paymentType: "PRIVATE",
    confidence: 0,
    documentType: "RECEIPT",
    warnings: [warning],
    notes: "",
    bewirtungKunde: "",
    bewirtungTeilnehmer: "",
    bewirtungAnlass: ""
  };
}

export function breakdownSum(entry: ReceiptEntry) {
  return (Number(entry.netAmount) || 0) + (Number(entry.vat7Amount) || 0) + (Number(entry.vat19Amount) || 0) + (Number(entry.tip) || 0);
}

export function missingReceiptFields(entry: ReceiptEntry) {
  return [
    !entry.expenseDate ? "Datum" : "",
    entry.description.trim().length < 2 ? "Beschreibung" : "",
    !(Number(entry.amount) > 0) ? "Gesamtbetrag" : "",
    !(Number(entry.exchangeRate) > 0) ? "Wechselkurs" : "",
    Math.abs(breakdownSum(entry) - Number(entry.amount)) > 0.01 ? "Aufschlüsselung (Netto + 7% + 19% + Trinkgeld muss dem Zahlbetrag entsprechen)" : "",
    entry.category === "Bewirtung" && !entry.bewirtungKunde.trim() ? "Bewirteter Kunde" : "",
    entry.category === "Bewirtung" && !entry.bewirtungTeilnehmer.trim() ? "Teilnehmende Personen" : "",
    entry.category === "Bewirtung" && !entry.bewirtungAnlass.trim() ? "Anlass der Bewirtung" : ""
  ].filter(Boolean);
}
