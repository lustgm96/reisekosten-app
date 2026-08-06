"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
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

type Preview = { fileIndex: number; mimeType: string; url: string };

type ExpenseFormProps = {
  analyzeUrl: string;
  reportId: string;
  saveUrl: string;
};

const MAX_FILES = 20;
const REQUEST_TIMEOUT_MS = 55_000;

export function ExpenseForm({ analyzeUrl, reportId, saveUrl }: ExpenseFormProps) {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [status, setStatus] = useState("");
  const [saveError, setSaveError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    if (!modalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !analyzing && !saving) setModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [analyzing, modalOpen, saving]);

  useEffect(() => {
    if (!modalOpen || analyzing || saving || entries.length || !uploadedFiles.length) return;
    setModalOpen(false);
    setUploadedFiles([]);
    setPreviews(current => {
      current.forEach(preview => URL.revokeObjectURL(preview.url));
      return [];
    });
    setUploadKey(key => key + 1);
    setStatus("Alle Belege wurden bearbeitet.");
  }, [analyzing, entries.length, modalOpen, saving, uploadedFiles.length]);

  async function analyzeFiles(files: File[]) {
    setAnalyzing(true);
    setEntries([]);
    setActiveIndex(0);
    setModalOpen(true);
    setSaveError("");
    const results: Entry[] = [];

    for (const [fileIndex, file] of files.entries()) {
      const startedAt = Date.now();
      const progress = () => setStatus(
        `${fileIndex + 1} von ${files.length}: ${file.name} wird lokal erkannt … ${Math.floor((Date.now() - startedAt) / 1000)} s`
      );
      progress();
      const progressTimer = window.setInterval(progress, 1000);
      const controller = new AbortController();
      const requestTimer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const formData = new FormData();
      formData.set("reportId", reportId);
      formData.set("file", file);

      try {
        const response = await fetch(analyzeUrl, {
          method: "POST",
          body: formData,
          signal: controller.signal
        });
        const result = await response.json() as Suggestion & { error?: string };
        if (!response.ok) throw new Error(result.error || "Belegerkennung fehlgeschlagen.");
        results.push({
          fileIndex,
          fileName: file.name,
          expenseDate: result.expenseDate ?? "",
          category: result.category || "Sonstiges",
          description: result.description === "Beleg" ? "" : result.description,
          amount: result.amount === null ? "" : result.amount.toFixed(2),
          vatAmount: result.vatAmount === null ? "" : result.vatAmount.toFixed(2),
          paymentType: "PRIVATE",
          confidence: result.confidence,
          documentType: result.documentType,
          warnings: result.warnings
        });
      } catch (error) {
        const timedOut = error instanceof DOMException && error.name === "AbortError";
        results.push({
          fileIndex,
          fileName: file.name,
          expenseDate: "",
          category: "Sonstiges",
          description: "",
          amount: "",
          vatAmount: "",
          paymentType: "PRIVATE",
          confidence: 0,
          documentType: "RECEIPT",
          warnings: [timedOut
            ? "Die Erkennung hat zu lange gedauert. Bitte Angaben manuell ergänzen."
            : error instanceof Error ? error.message : "Belegerkennung fehlgeschlagen."]
        });
      } finally {
        window.clearInterval(progressTimer);
        window.clearTimeout(requestTimer);
      }
      const recognizedEntry = results.at(-1);
      if (recognizedEntry) {
        setEntries(current => current.some(entry => entry.fileIndex === recognizedEntry.fileIndex)
          ? current
          : [...current, recognizedEntry]
        );
      }
    }

    setStatus(`${files.length} Datei${files.length === 1 ? "" : "en"} vorgeprüft. Bitte Vorschläge kontrollieren.`);
    setAnalyzing(false);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > MAX_FILES) {
      setUploadedFiles([]);
      setEntries([]);
      setStatus(`Bitte höchstens ${MAX_FILES} Belege auf einmal auswählen.`);
      event.target.value = "";
      return;
    }
    if (!files.length) return;
    setUploadedFiles(files);
    setPreviews(current => {
      current.forEach(preview => URL.revokeObjectURL(preview.url));
      return files.map((file, fileIndex) => ({
        fileIndex,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      }));
    });
    void analyzeFiles(files);
  }

  function updateEntry(fileIndex: number, values: Partial<Entry>) {
    setEntries(current => current.map(entry =>
      entry.fileIndex === fileIndex ? { ...entry, ...values } : entry
    ));
  }

  function removeEntry(fileIndex: number) {
    setEntries(current => {
      const next = current.filter(entry => entry.fileIndex !== fileIndex);
      setActiveIndex(index => Math.min(index, Math.max(0, next.length - 1)));
      return next;
    });
  }

  async function save(_formData: FormData) {
    const receipt = activeEntry;
    if (!receipt) return;
    if (receipt.documentType === "CARD_STATEMENT") {
      removeEntry(receipt.fileIndex);
      setSaveError("");
      setStatus(`${receipt.fileName} wurde nicht als Ausgabe übernommen.`);
      return;
    }
    if (!receipt.expenseDate || receipt.description.trim().length < 2 || !(Number(receipt.amount) > 0)) {
      const missing = [
        !receipt.expenseDate ? "Datum" : "",
        receipt.description.trim().length < 2 ? "Beschreibung" : "",
        !(Number(receipt.amount) > 0) ? "Gesamtbetrag" : ""
      ].filter(Boolean).join(", ");
      setSaveError(`Bitte ${missing} prüfen bzw. ergänzen.`);
      setStatus(`${receipt.fileName} ist noch unvollständig.`);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const file = uploadedFiles[receipt.fileIndex];
      if (!(file instanceof File)) throw new Error(`Die Datei ${receipt.fileName} ist nicht mehr verfügbar.`);
      setStatus(`${receipt.fileName} wird gespeichert …`);
      const singleReceipt = new FormData();
      singleReceipt.set("files", file);
      singleReceipt.set("entries", JSON.stringify([{ ...receipt, fileIndex: 0, vatAmount: receipt.vatAmount || "0" }]));
      const response = await fetch(saveUrl, { method: "POST", body: singleReceipt });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || `${receipt.fileName} konnte nicht gespeichert werden.`);
      const remainingEntries = entries.filter(entry => entry.fileIndex !== receipt.fileIndex);
      setEntries(remainingEntries);
      setActiveIndex(index => Math.min(index, Math.max(0, remainingEntries.length - 1)));
      setPreviews(current => {
        const savedPreview = current.find(preview => preview.fileIndex === receipt.fileIndex);
        if (savedPreview) URL.revokeObjectURL(savedPreview.url);
        return current.filter(preview => preview.fileIndex !== receipt.fileIndex);
      });
      setStatus(`${receipt.fileName} wurde gespeichert.${remainingEntries.length || analyzing ? " Nächster Beleg wird geöffnet." : ""}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Belege konnten nicht gespeichert werden.";
      setSaveError(message);
      setStatus(`Speichern abgebrochen: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  const activeEntry = entries[activeIndex];
  const activePreview = activeEntry
    ? previews.find(preview => preview.fileIndex === activeEntry.fileIndex)
    : undefined;

  return (
    <form action={save} className="expense-entry-form">
      <div className="receipt-upload-first">
        <label htmlFor="new-expense-files">1. Belege auswählen oder fotografieren</label>
        <input
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          id="new-expense-files"
          key={uploadKey}
          multiple
          name="files"
          onChange={selectFiles}
          type="file"
        />
        <div className={`recognition-status${analyzing ? " analyzing" : ""}`} aria-live="polite">
          {status || "Mehrere Bilder und PDFs können gemeinsam ausgewählt und lokal vorgeprüft werden."}
        </div>
        {!modalOpen && entries.length > 0 && (
          <button className="secondary" onClick={() => setModalOpen(true)} type="button">
            Prüfung fortsetzen
          </button>
        )}
      </div>

      {modalOpen && <div aria-label="Belege prüfen" aria-modal="true" className="receipt-review-modal" role="dialog">
        <div className="receipt-review-modal-card">
          <div className="receipt-review-modal-header">
            <div>
              <strong>Beleg prüfen</strong>
              <div className="small">{status}</div>
            </div>
            <button className="secondary" disabled={analyzing || saving} onClick={() => setModalOpen(false)} type="button">Schließen</button>
          </div>

          <div className="receipt-review-modal-body">
            <div className="receipt-document-panel">
              {activePreview ? activePreview.mimeType.startsWith("image/") ? (
                <img alt="Ausgewählter Beleg" src={activePreview.url} />
              ) : (
                <iframe src={activePreview.url} title="Ausgewählter PDF-Beleg" />
              ) : <div className="small">Dokumentvorschau wird vorbereitet …</div>}
            </div>

            <div className="receipt-values-panel">
              {!activeEntry ? <div className="recognition-status analyzing">Beleg wird analysiert …</div> : <>
                <div className="receipt-review-heading">
                  <div><strong>{activeEntry.fileName}</strong><div className="small">Erkennung {activeEntry.confidence} %</div></div>
                  <button className="secondary compact" onClick={() => removeEntry(activeEntry.fileIndex)} type="button">Entfernen</button>
                </div>

                {activeEntry.documentType === "CARD_STATEMENT" ? (
                  <div className="recognition-warnings">Kreditkartenabrechnung erkannt. Sie wird nicht als einzelne Ausgabe gespeichert.</div>
                ) : <>
                  {activeEntry.warnings.length > 0 && <ul className="recognition-warnings">{activeEntry.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
                  <div className="row">
                    <div><label>Datum</label><input required type="date" value={activeEntry.expenseDate} onChange={event => updateEntry(activeEntry.fileIndex, { expenseDate: event.target.value })} /></div>
                    <div><label>Kategorie</label><select value={activeEntry.category} onChange={event => updateEntry(activeEntry.fileIndex, { category: event.target.value })}>
                      <option>Hotel</option><option>Bewirtung</option><option>Parken</option><option>Taxi</option><option>Bahn</option><option>Flug</option><option>Tanken</option><option>Sonstiges</option>
                    </select></div>
                  </div>
                  <div>
                    <label>Händler / Beschreibung</label>
                    <input maxLength={240} placeholder={activeEntry.category === "Sonstiges" ? "z. B. Visumgebühr für Geschäftsreise" : undefined} required value={activeEntry.description} onChange={event => updateEntry(activeEntry.fileIndex, { description: event.target.value })} />
                    {activeEntry.category === "Sonstiges" && <div className="recognition-status">Bitte beschreibe die Ausgabe möglichst konkret und nenne ihren geschäftlichen Anlass. Das erleichtert die Zuordnung und Prüfung.</div>}
                  </div>
                  <div className="row">
                    <div><label>Gesamtbetrag</label><input min="0.01" required step=".01" type="number" value={activeEntry.amount} onChange={event => updateEntry(activeEntry.fileIndex, { amount: event.target.value })} /></div>
                  </div>
                  <div><label>Zahlungsart</label><select value={activeEntry.paymentType} onChange={event => updateEntry(activeEntry.fileIndex, { paymentType: event.target.value as Entry["paymentType"] })}>
                    <option value="PRIVATE">Privat ausgelegt</option><option value="COMPANY_CARD">Firmenkarte</option><option value="CASH">Bar</option>
                  </select></div>
                </>}
              </>}
            </div>
          </div>

          <div className="receipt-review-modal-footer">
            <span className="small">{activeEntry ? `${Math.max(0, entries.length - 1)} weitere erkannte Belege warten` : "Der nächste Beleg wird erkannt …"}</span>
            <div>
              {saveError && <div className="error">{saveError}</div>}
              <button disabled={saving || !activeEntry}>
                {saving ? "Wird gespeichert …" : activeEntry?.documentType === "CARD_STATEMENT" ? "Nicht übernehmen und nächsten öffnen" : "Beleg speichern und nächsten öffnen"}
              </button>
            </div>
          </div>
        </div>
      </div>}
    </form>
  );
}
