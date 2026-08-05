"use client";

import { useState, type ChangeEvent } from "react";
import "./expense-form.css";

type Suggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  documentType: "RECEIPT" | "CARD_STATEMENT";
  expenseDate: string | null;
  vatAmount: number | null;
  warnings: string[];
};

type Entry = {
  fileIndex: number;
  fileName: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  vatAmount: string;
  paymentType: "PRIVATE" | "COMPANY_CARD" | "CASH";
  confidence: number;
  documentType: Suggestion["documentType"];
  warnings: string[];
};

type ExpenseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  analyzeUrl: string;
  reportId: string;
};

export function ExpenseForm({ action, analyzeUrl, reportId }: ExpenseFormProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  async function analyzeFiles(files: File[]) {
    setAnalyzing(true);
    setEntries([]);
    const results: Entry[] = [];

    for (const [fileIndex, file] of files.entries()) {
      setStatus(`${fileIndex + 1} von ${files.length}: ${file.name} wird lokal erkannt …`);
      const formData = new FormData();
      formData.set("reportId", reportId);
      formData.set("file", file);

      try {
        const response = await fetch(analyzeUrl, { method: "POST", body: formData });
        const result = await response.json() as Suggestion & { error?: string };
        if (!response.ok) throw new Error(result.error || "Belegerkennung fehlgeschlagen.");
        results.push({
          fileIndex,
          fileName: file.name,
          expenseDate: result.expenseDate ?? "",
          category: result.category || "Sonstiges",
          description: result.description === "Beleg" ? "" : result.description,
          amount: result.amount === null ? "" : result.amount.toFixed(2),
          vatAmount: result.vatAmount === null ? "0" : result.vatAmount.toFixed(2),
          paymentType: "PRIVATE",
          confidence: result.confidence,
          documentType: result.documentType,
          warnings: result.warnings
        });
      } catch (error) {
        results.push({
          fileIndex,
          fileName: file.name,
          expenseDate: "",
          category: "Sonstiges",
          description: "",
          amount: "",
          vatAmount: "0",
          paymentType: "PRIVATE",
          confidence: 0,
          documentType: "RECEIPT",
          warnings: [error instanceof Error ? error.message : "Belegerkennung fehlgeschlagen."]
        });
      }
      setEntries([...results]);
    }

    setStatus(`${files.length} Datei${files.length === 1 ? "" : "en"} vorgeprüft. Bitte Vorschläge kontrollieren.`);
    setAnalyzing(false);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) void analyzeFiles(files);
  }

  function updateEntry(fileIndex: number, values: Partial<Entry>) {
    setEntries(current => current.map(entry =>
      entry.fileIndex === fileIndex ? { ...entry, ...values } : entry
    ));
  }

  function removeEntry(fileIndex: number) {
    setEntries(current => current.filter(entry => entry.fileIndex !== fileIndex));
  }

  const receipts = entries.filter(entry => entry.documentType === "RECEIPT");
  const canSave = receipts.length > 0 && receipts.every(entry =>
    entry.expenseDate && entry.description.trim().length >= 2 && Number(entry.amount) > 0
  );

  return (
    <form action={action} className="expense-entry-form">
      <div className="receipt-upload-first">
        <label htmlFor="new-expense-files">1. Belege auswählen oder fotografieren</label>
        <input
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          id="new-expense-files"
          multiple
          name="files"
          onChange={selectFiles}
          type="file"
        />
        <div className={`recognition-status${analyzing ? " analyzing" : ""}`} aria-live="polite">
          {status || "Mehrere Bilder und PDFs können gemeinsam ausgewählt und lokal vorgeprüft werden."}
        </div>
      </div>

      {entries.length > 0 && <div className="receipt-review-list">
        <div className="small">2. Erkannte Angaben prüfen und bei Bedarf korrigieren</div>
        {entries.map(entry => {
          const statement = entry.documentType === "CARD_STATEMENT";
          const needsReview = statement || entry.warnings.length > 0 || entry.confidence < 75;
          return <section className={`receipt-review-card${needsReview ? " needs-review" : ""}`} key={entry.fileIndex}>
            <div className="receipt-review-heading">
              <div>
                <strong>{entry.fileName}</strong>
                <div className="small">Erkennung {entry.confidence} %</div>
              </div>
              <button className="secondary compact" onClick={() => removeEntry(entry.fileIndex)} type="button">Entfernen</button>
            </div>
            {statement ? (
              <div className="recognition-warnings">Kreditkartenabrechnung erkannt. Sie wird nicht als einzelne Ausgabe gespeichert.</div>
            ) : <>
              {entry.warnings.length > 0 && <ul className="recognition-warnings">
                {entry.warnings.map(warning => <li key={warning}>{warning}</li>)}
              </ul>}
              <div className="row">
                <div><label>Datum</label><input required type="date" value={entry.expenseDate} onChange={event => updateEntry(entry.fileIndex, { expenseDate: event.target.value })} /></div>
                <div><label>Kategorie</label><select value={entry.category} onChange={event => updateEntry(entry.fileIndex, { category: event.target.value })}>
                  <option>Hotel</option><option>Bewirtung</option><option>Parken</option><option>Taxi</option><option>Bahn</option><option>Flug</option><option>Tanken</option><option>Sonstiges</option>
                </select></div>
              </div>
              <div><label>Händler / Beschreibung</label><input maxLength={240} required value={entry.description} onChange={event => updateEntry(entry.fileIndex, { description: event.target.value })} /></div>
              <div className="row">
                <div><label>Gesamtbetrag</label><input min="0.01" required step=".01" type="number" value={entry.amount} onChange={event => updateEntry(entry.fileIndex, { amount: event.target.value })} /></div>
                <div><label>enthaltene MwSt.</label><input min="0" step=".01" type="number" value={entry.vatAmount} onChange={event => updateEntry(entry.fileIndex, { vatAmount: event.target.value })} /></div>
              </div>
              <div><label>Zahlungsart</label><select value={entry.paymentType} onChange={event => updateEntry(entry.fileIndex, { paymentType: event.target.value as Entry["paymentType"] })}>
                <option value="PRIVATE">Privat ausgelegt</option><option value="COMPANY_CARD">Firmenkarte</option><option value="CASH">Bar</option>
              </select></div>
            </>}
          </section>;
        })}
        <input name="entries" type="hidden" value={JSON.stringify(receipts)} />
        <button disabled={analyzing || !canSave}>
          {receipts.length === 1 ? "Geprüfte Ausgabe speichern" : `${receipts.length} geprüfte Ausgaben speichern`}
        </button>
        {!canSave && receipts.length > 0 && <div className="small">Vor dem Speichern bitte Datum, Beschreibung und Betrag aller Belege ergänzen.</div>}
      </div>}
    </form>
  );
}
