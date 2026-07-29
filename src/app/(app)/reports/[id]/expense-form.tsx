"use client";

import { useState, type ChangeEvent } from "react";
import "./expense-form.css";

type Suggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  expenseDate: string | null;
  vatAmount: number | null;
  warnings: string[];
};

type ExpenseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  analyzeUrl: string;
  reportId: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function ExpenseForm({ action, analyzeUrl, reportId }: ExpenseFormProps) {
  const [expenseDate, setExpenseDate] = useState(today);
  const [category, setCategory] = useState("Sonstiges");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  async function analyze(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus("PDF-Belege können gespeichert, derzeit aber noch nicht lokal erkannt werden.");
      setWarnings([]);
      return;
    }

    setAnalyzing(true);
    setStatus("Beleg wird lokal erkannt …");
    setWarnings([]);
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("file", file);

    try {
      const response = await fetch(analyzeUrl, { method: "POST", body: formData });
      const result = await response.json() as Suggestion & { error?: string };
      if (!response.ok) throw new Error(result.error || "Belegerkennung fehlgeschlagen.");

      if (result.expenseDate) setExpenseDate(result.expenseDate);
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      if (result.amount !== null) setAmount(result.amount.toFixed(2));
      if (result.vatAmount !== null) setVatAmount(result.vatAmount.toFixed(2));
      setWarnings(result.warnings);
      setStatus(`Vorschläge übernommen · Erkennung ${result.confidence} %`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Belegerkennung fehlgeschlagen.");
    } finally {
      setAnalyzing(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void analyze(file);
  }

  return (
    <form action={action} className="expense-entry-form">
      <div className="receipt-upload-first">
        <label htmlFor="new-expense-file">1. Beleg auswählen oder fotografieren</label>
        <input
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          id="new-expense-file"
          name="file"
          onChange={selectFile}
          type="file"
        />
        <div className={`recognition-status${analyzing ? " analyzing" : ""}`} aria-live="polite">
          {status || "Bildbelege werden automatisch und ausschließlich auf diesem Server ausgewertet."}
        </div>
        {warnings.length > 0 && (
          <ul className="recognition-warnings">
            {warnings.map(warning => <li key={warning}>{warning}</li>)}
          </ul>
        )}
      </div>

      <div className="small">2. Erkannte Angaben kurz prüfen</div>
      <div className="row">
        <div>
          <label htmlFor="new-expense-date">Datum</label>
          <input id="new-expense-date" name="expenseDate" onChange={event => setExpenseDate(event.target.value)} required type="date" value={expenseDate} />
        </div>
        <div>
          <label htmlFor="new-expense-category">Kategorie</label>
          <select id="new-expense-category" name="category" onChange={event => setCategory(event.target.value)} value={category}>
            <option>Hotel</option>
            <option>Bewirtung</option>
            <option>Parken</option>
            <option>Taxi</option>
            <option>Bahn</option>
            <option>Flug</option>
            <option>Tanken</option>
            <option>Sonstiges</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="new-expense-description">Händler / Beschreibung</label>
        <input id="new-expense-description" maxLength={240} name="description" onChange={event => setDescription(event.target.value)} required value={description} />
      </div>
      <div className="row">
        <div>
          <label htmlFor="new-expense-amount">Gesamtbetrag</label>
          <input id="new-expense-amount" min="0.01" name="amount" onChange={event => setAmount(event.target.value)} required step=".01" type="number" value={amount} />
        </div>
        <div>
          <label htmlFor="new-expense-vat">enthaltene MwSt.</label>
          <input id="new-expense-vat" min="0" name="vatAmount" onChange={event => setVatAmount(event.target.value)} step=".01" type="number" value={vatAmount} />
        </div>
      </div>
      <div>
        <label htmlFor="new-expense-payment">Zahlungsart</label>
        <select id="new-expense-payment" name="paymentType" defaultValue="PRIVATE">
          <option value="PRIVATE">Privat ausgelegt</option>
          <option value="COMPANY_CARD">Firmenkarte</option>
          <option value="CASH">Bar</option>
        </select>
      </div>
      <button disabled={analyzing}>Ausgabe speichern</button>
    </form>
  );
}
