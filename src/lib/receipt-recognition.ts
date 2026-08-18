import path from "node:path";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import german from "@tesseract.js-data/deu";

export type ReceiptSuggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  expenseDate: string | null;
  vatAmount: number | null;
  warnings: string[];
};

let workerPromise: Promise<Worker> | null = null;
let recognitionQueue = Promise.resolve();
const OCR_PAGE_TIMEOUT_MS = 20_000;
const WORKER_TERMINATE_TIMEOUT_MS = 5_000;
const workerPath = path.join(
  process.cwd(),
  "node_modules/tesseract.js/src/worker-script/node/index.js"
);
const corePath = path.join(process.cwd(), "node_modules/tesseract.js-core");

function getWorker() {
  if (workerPromise) return workerPromise;

  const pendingWorker = createWorker(german.code, OEM.LSTM_ONLY, {
    cacheMethod: "none",
    corePath,
    gzip: german.gzip,
    langPath: german.langPath,
    workerPath
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
    await withTimeout(
      worker.terminate(),
      WORKER_TERMINATE_TIMEOUT_MS,
      "OCR-Worker konnte nicht rechtzeitig beendet werden."
    );
  } catch {
    // Der ursprüngliche OCR-Fehler ist für den Aufrufer relevanter.
  }
}

export async function terminateReceiptWorker() {
  const worker = await workerPromise?.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function parseMoney(value: string) {
  const compact = value.replace(/\s/g, "");
  const normalized =
    compact.includes(",")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function moneyValues(line: string) {
  return [...line.matchAll(/(?:^|\s)(\d{1,5}(?:[.\s]\d{3})*[,.]\d{2})(?=\s*(?:€|EUR)?(?:\s|[.,;:|)\]]|$))/gi)]
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
  return null;
}

function detectAmount(lines: string[]) {
  const totalWords = /(gesamt|summe|total|zu zahlen|endbetrag|zahlbetrag|betrag)/i;
  const preferred = lines
    .filter(line => totalWords.test(line))
    .flatMap(moneyValues);
  if (preferred.length) return Math.max(...preferred);
  const all = lines.flatMap(moneyValues);
  return all.length ? Math.max(...all) : null;
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
  const amount = detectAmount(lines);
  const expenseDate = detectDate(text);
  const description = detectDescription(lines);
  const vatAmount = detectVat(lines, amount);
  const warnings: string[] = [];
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
        results.push(await withTimeout(
          worker.recognize(page),
          OCR_PAGE_TIMEOUT_MS,
          "Die lokale Belegerkennung dauert zu lange."
        ));
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
