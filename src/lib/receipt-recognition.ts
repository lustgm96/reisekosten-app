import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import german from "@tesseract.js-data/deu";

export type ReceiptSuggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  expenseDate: string | null;
  vatAmount: number | null;
  documentType: "RECEIPT" | "CARD_STATEMENT";
  warnings: string[];
};

let workerPromise: Promise<Worker> | null = null;
let recognitionQueue = Promise.resolve();

function getWorker() {
  if (workerPromise) return workerPromise;

  const pendingWorker = createWorker(german.code, OEM.LSTM_ONLY, {
    cacheMethod: "none",
    gzip: german.gzip,
    langPath: german.langPath
  }).then(async worker => {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: PSM.AUTO
    });
    return worker;
  });
  workerPromise = pendingWorker;
  void pendingWorker.catch(() => {
    if (workerPromise === pendingWorker) workerPromise = null;
  });
  return pendingWorker;
}

async function discardWorker(worker: Worker) {
  workerPromise = null;
  try {
    await worker.terminate();
  } catch {
    // Der ursprüngliche OCR-Fehler ist für den Aufrufer relevanter.
  }
}

export async function terminateReceiptWorker() {
  const worker = await workerPromise?.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate();
}

function parseMoney(value: string) {
  const compact = value.replace(/\s/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const normalized = lastComma > lastDot
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function moneyValues(line: string) {
  return [...line.matchAll(/(?:^|\s)(?:€\s*|EUR\s*)?(\d{1,5}(?:[.,\s]\d{3})*[,.]\d{2})(?=\s*(?:€|EUR)?(?:\s|[.,;:|)\]]|$))/gi)]
    .map(match => parseMoney(match[1]))
    .filter((value): value is number => value !== null && value >= 0);
}

function detectDate(text: string) {
  const now = new Date();
  const candidates = [
    ...text.matchAll(/\b([0-3]?\d)[./-]([01]?\d)[./-](20\d{2}|\d{2})\b/g)
  ];
  for (const match of candidates) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    const month = Number(match[2]);
    const day = Number(match[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      year >= 2000 &&
      date.getTime() <= now.getTime() + 86_400_000
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const monthNumbers: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
    sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
    dec: 12, december: 12
  };
  const wordDate = text.match(/\b([0-3]?\d)\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+['’]?(20\d{2}|\d{2})\b/i);
  if (wordDate) {
    const year = Number(wordDate[3]) < 100 ? 2000 + Number(wordDate[3]) : Number(wordDate[3]);
    const month = monthNumbers[wordDate[2].toLowerCase()];
    const day = Number(wordDate[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCDate() === day && date.getTime() <= now.getTime() + 86_400_000) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

function detectAmount(lines: string[]) {
  const totalWords = /(gesamt|summe|total(?: incl\.?(?: vat)?)?|zu zahlen|endbetrag|zahlbetrag|betrag|amount|payment due|balance due|approval amount|transaction amount)/i;
  const preferred = lines
    .filter(line => totalWords.test(line))
    .flatMap(moneyValues);
  if (preferred.length) return Math.max(...preferred);
  const all = lines.flatMap(moneyValues);
  return all.length ? Math.max(...all) : null;
}

function detectDocumentType(text: string): ReceiptSuggestion["documentType"] {
  const statementSignals = [
    /kreditkartenabrechnung/i,
    /abrechnung business card/i,
    /abrechnungssaldo/i,
    /umsatzdatum\s+buchungsdatum/i,
    /verf[üu]gungsrahmen/i
  ].filter(pattern => pattern.test(text)).length;
  return statementSignals >= 2 ? "CARD_STATEMENT" : "RECEIPT";
}

function detectVat(lines: string[], total: number | null) {
  const values = lines
    .filter(line => /(mwst|ust|umsatzsteuer|mehrwertsteuer|steuer)/i.test(line))
    .flatMap(moneyValues)
    .filter(value => value > 0 && (total === null || value < total));
  return values.length ? values.at(-1) ?? null : null;
}

function detectDescription(lines: string[]) {
  const ignored = /(kassenbon|rechnung|quittung|beleg|steuer|datum|uhrzeit|telefon|tel\.|www\.|straße|str\.|ust-id|eur)/i;
  return (
    lines.find(line =>
      line.length >= 3 &&
      line.length <= 80 &&
      /[a-zäöüß]{3}/i.test(line) &&
      !ignored.test(line) &&
      !/^\d/.test(line)
    ) ?? "Beleg"
  );
}

function detectCategory(text: string) {
  const categories: Array<[RegExp, string]> = [
    [/(hotel|pension|übernachtung|zimmer)/i, "Hotel"],
    [/(parkhaus|parken|parking|parkgebühr)/i, "Parken"],
    [/(taxi|uber|bolt)/i, "Taxi"],
    [/(deutsche bahn|bahn|db fernverkehr|fahrkarte|ticket)/i, "Bahn"],
    [/(flug|airline|boarding|lufthansa|eurowings)/i, "Flug"],
    [/(tankstelle|diesel|benzin|super e\d|shell|aral|esso)/i, "Tanken"],
    [/(restaurant|gasthaus|café|cafe|bistro|bewirtung)/i, "Bewirtung"]
  ];
  return categories.find(([pattern]) => pattern.test(text))?.[1] ?? "Sonstiges";
}

export function extractReceiptSuggestion(text: string, ocrConfidence = 0): ReceiptSuggestion {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const documentType = detectDocumentType(text);
  let amount = detectAmount(lines);
  const expenseDate = detectDate(text);
  const description = detectDescription(lines);
  const vatAmount = detectVat(lines, amount);
  const warnings: string[] = [];
  if (documentType === "CARD_STATEMENT") {
    amount = null;
    warnings.push("Kreditkartenabrechnung erkannt: Bitte nicht als einzelnen Beleg speichern.");
  }
  if (amount !== null && amount > 10000) {
    amount = null;
    warnings.push("Der erkannte Betrag ist unplausibel hoch und muss manuell geprüft werden.");
  }
  if (!expenseDate) warnings.push("Datum konnte nicht sicher erkannt werden.");
  if (amount === null) warnings.push("Gesamtbetrag konnte nicht sicher erkannt werden.");
  if (description === "Beleg") warnings.push("Händler konnte nicht sicher erkannt werden.");

  const foundFields = [expenseDate, amount, description !== "Beleg", vatAmount].filter(Boolean).length;
  const confidence = Math.round(Math.min(100, Math.max(0, ocrConfidence) * 0.6 + foundFields * 10));

  return {
    amount,
    category: detectCategory(text),
    confidence,
    description,
    expenseDate,
    vatAmount,
    documentType,
    warnings
  };
}

export function recognizeReceipt(image: Buffer) {
  return recognizeReceiptPages([image]);
}

export function recognizeReceiptPages(images: Buffer[]) {
  if (!images.length) throw new Error("Keine Belegseiten vorhanden.");

  const job = recognitionQueue.then(async () => {
    const worker = await getWorker();
    try {
      const results = [];
      for (const page of images) {
        results.push(await worker.recognize(page));
      }
      const text = results.map(result => result.data.text).join("\n");
      const confidence =
        results.reduce((sum, result) => sum + result.data.confidence, 0) / results.length;
      return extractReceiptSuggestion(text, confidence);
    } catch (error) {
      await discardWorker(worker);
      throw error;
    }
  });
  recognitionQueue = job.then(() => undefined, () => undefined);
  return job;
}
