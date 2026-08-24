export type ReceiptSuggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  documentType: "RECEIPT" | "CARD_STATEMENT";
  expenseDate: string | null;
  vatAmount: number | null;
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
  vatAmount: string;
  warnings: string[];
  notes: string;
  bewirtungKunde: string;
  bewirtungTeilnehmer: string;
  bewirtungAnlass: string;
};

export const expenseCategories = ["Hotel", "Bewirtung", "Parken", "Taxi", "Bahn", "Flug", "Tanken", "Sonstiges"] as const;

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
    vatAmount: suggestion.vatAmount === null ? "" : suggestion.vatAmount.toFixed(2),
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
    vatAmount: "",
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

export function missingReceiptFields(entry: ReceiptEntry) {
  return [
    !entry.expenseDate ? "Datum" : "",
    entry.description.trim().length < 2 ? "Beschreibung" : "",
    !(Number(entry.amount) > 0) ? "Gesamtbetrag" : "",
    !(Number(entry.exchangeRate) > 0) ? "Wechselkurs" : "",
    entry.category === "Bewirtung" && !entry.bewirtungKunde.trim() ? "Bewirteter Kunde" : "",
    entry.category === "Bewirtung" && !entry.bewirtungTeilnehmer.trim() ? "Teilnehmende Personen" : "",
    entry.category === "Bewirtung" && !entry.bewirtungAnlass.trim() ? "Anlass der Bewirtung" : ""
  ].filter(Boolean);
}
