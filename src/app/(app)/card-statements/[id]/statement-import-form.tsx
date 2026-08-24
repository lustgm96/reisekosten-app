"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { cardStatementCategories } from "@/lib/card-statement-workflow";

type CandidateItem = {
  include: boolean;
  transactionDate: string;
  category: string;
  description: string;
  amount: string;
};

type StatementImportFormProps = {
  analyzeUrl: string;
  importUrl: string;
};

function guessCategory(description: string) {
  const text = description.toLowerCase();
  if (/(tank|diesel|benzin|shell|aral|esso)/.test(text)) return "Tanken";
  if (/(maut|parkh|parken)/.test(text)) return "Parken";
  if (/(taxi|uber|bolt)/.test(text)) return "Taxi";
  if (/(bahn|db )/.test(text)) return "Bahn";
  if (/(flug|airline)/.test(text)) return "Flug";
  if (/(hotel)/.test(text)) return "Hotel";
  return "Sonstiges";
}

export function StatementImportForm({ analyzeUrl, importUrl }: StatementImportFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setItems([]);
    setError("");
    setAnalyzing(true);
    setStatus(`${selected.name} wird lokal analysiert …`);
    try {
      const formData = new FormData();
      formData.set("file", selected);
      const response = await fetch(analyzeUrl, { method: "POST", body: formData });
      const result = await response.json() as { items?: Array<{ transactionDate: string | null; description: string; amount: number }>; error?: string };
      if (!response.ok) throw new Error(result.error || "Analyse fehlgeschlagen.");
      const found = (result.items ?? []).map(candidate => ({
        include: true,
        transactionDate: candidate.transactionDate ?? "",
        category: guessCategory(candidate.description),
        description: candidate.description,
        amount: candidate.amount.toFixed(2)
      }));
      setItems(found);
      setStatus(found.length
        ? `${found.length} Position${found.length === 1 ? "" : "en"} erkannt. Bitte prüfen, ergänzen und übernehmen.`
        : "Keine Positionen automatisch erkannt. Bitte unten manuell hinzufügen.");
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Analyse fehlgeschlagen.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateItem(index: number, values: Partial<CandidateItem>) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
  }

  function addBlankRow() {
    setItems(current => [...current, { include: true, transactionDate: "", category: "Sonstiges", description: "", amount: "" }]);
  }

  async function importItems() {
    setError("");
    const selected = items.filter(item => item.include);
    const invalid = selected.some(item => !item.transactionDate || item.description.trim().length < 2 || !(Number(item.amount) > 0));
    if (!selected.length) { setError("Bitte mindestens eine Position auswählen."); return; }
    if (invalid) { setError("Bitte Datum, Beschreibung und Betrag jeder ausgewählten Position prüfen."); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      if (file) formData.set("file", file);
      formData.set("items", JSON.stringify(selected.map(item => ({
        transactionDate: item.transactionDate,
        category: item.category,
        description: item.description,
        amount: item.amount
      }))));
      const response = await fetch(importUrl, { method: "POST", body: formData });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Die Positionen konnten nicht übernommen werden.");
      setItems([]);
      setFile(null);
      setStatus("Positionen übernommen.");
      router.refresh();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Die Positionen konnten nicht übernommen werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label htmlFor="statement-file">Monatliche Sammelabrechnung (PDF/Scan) hochladen</label>
      <input accept="image/jpeg,image/png,image/webp,application/pdf" id="statement-file" onChange={selectFile} type="file" />
      {status && <div className="small" aria-live="polite">{status}</div>}
      {error && <div className="error">{error}</div>}

      {(analyzing || items.length > 0) && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th /><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th>Betrag</th></tr></thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><input checked={item.include} onChange={event => updateItem(index, { include: event.target.checked })} type="checkbox" /></td>
                <td><input onChange={event => updateItem(index, { transactionDate: event.target.value })} required type="date" value={item.transactionDate} /></td>
                <td>
                  <select onChange={event => updateItem(index, { category: event.target.value })} value={item.category}>
                    {cardStatementCategories.map(category => <option key={category}>{category}</option>)}
                  </select>
                </td>
                <td><input maxLength={240} onChange={event => updateItem(index, { description: event.target.value })} required value={item.description} /></td>
                <td><input min="0.01" onChange={event => updateItem(index, { amount: event.target.value })} required step=".01" type="number" value={item.amount} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(items.length > 0 || file) && (
        <div className="actions" style={{ marginTop: 10 }}>
          <button disabled={analyzing} onClick={addBlankRow} type="button" className="secondary">Zeile hinzufügen</button>
          <button disabled={saving || analyzing || !items.length} onClick={importItems} type="button">
            {saving ? "Wird übernommen …" : "Ausgewählte Positionen übernehmen"}
          </button>
        </div>
      )}
    </div>
  );
}
