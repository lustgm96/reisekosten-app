import path from "node:path";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import german from "@tesseract.js-data/deu";

export type ReceiptSuggestion = {
  amount: number | null;
  category: string;
  confidence: number;
  description: string;
  expenseDate: string | null;
  vat7Amount: number | null;
  vat19Amount: number | null;
  documentType: "RECEIPT" | "CARD_STATEMENT";
  warnings: string[];
};

let workerPromise: Promise<Worker> | null = null;
let recognitionQueue = Promise.resolve();
const OCR_PAGE_TIMEOUT_MS = 45_000;
const WORKER_TERMINATE_TIMEOUT_MS = 5_000;
const workerPath = path.join(
  process.cwd(),
  "node_modules/tesseract.js/src/worker-script/node/index.js"
);
const corePath = path.join(process.cwd(), "node_modules/tesseract.js-core");

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

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
  const validDates: string[] = [];
  const candidates = [
    ...text.matchAll(/\b([0-3]?\d)\s*[.,/-]\s*([01]?\d)\s*[.,/-]\s*(20\d{2}|\d{2})\b/g)
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
      validDates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
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
      validDates.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }
  if (!validDates.length) return null;
  const frequency = new Map<string, number>();
  validDates.forEach(value => frequency.set(value, (frequency.get(value) ?? 0) + 1));
  return validDates.reduce((best, value) =>
    (frequency.get(value) ?? 0) > (frequency.get(best) ?? 0) ? value : best
  );
}

function detectAmount(lines: string[]) {
  const strongTotalWords = /(gesamt|summe|grand total|total sales|total incl\.?|payment due|zu zahlen|endbetrag|zahlbetrag|approval amount|transaction amount)/i;
  const strong = lines
    .filter(line => strongTotalWords.test(line))
    .map(moneyValues)
    .filter(values => values.length)
    .map(values => values.at(-1) as number);
  if (strong.length) return strong.at(-1) ?? null;
  const preferred = lines
    .filter(line => /(total|betrag|amount|balance due)/i.test(line))
    .flatMap(moneyValues);
  if (preferred.length) return preferred.at(-1) ?? null;
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

function detectVat(lines: string[], total: number | null): { amount: number; rate: 7 | 19 } | null {
  const taxLines = lines.filter(line => /(mwst|ust|umsatzsteuer|mehrwertsteuer|steuer|\bvat\b|\btax\b)/i.test(line));
  const numberedTaxValues = taxLines
    .filter(line => /\btax\s*\d/i.test(line))
    .map(line => moneyValues(line).filter(value => value > 0 && (total === null || value < total)))
    .filter(values => values.length)
    .map(values => Math.min(...values));
  const percentage = taxLines.join(" ").match(/\b(\d{1,2}(?:[.,]\d+)?)\s*%/);
  const detectedRate = percentage ? Number(percentage[1].replace(",", ".")) : null;
  const rate: 7 | 19 = detectedRate !== null && Math.abs(detectedRate - 7) < Math.abs(detectedRate - 19) ? 7 : 19;

  if (numberedTaxValues.length > 1) {
    const amount = Math.round(numberedTaxValues.reduce((sum, value) => sum + value, 0) * 100) / 100;
    return { amount, rate };
  }
  const values = taxLines
    .map(line => moneyValues(line).filter(value => value > 0 && (total === null || value < total)))
    .filter(values => values.length)
    .map(values => Math.min(...values));
  const detected = values.length ? values.at(-1) ?? null : null;
  if (detected !== null && total !== null && detectedRate !== null) {
    const calculated = Math.round(total * detectedRate / (100 + detectedRate) * 100) / 100;
    if (detectedRate >= 5 && detectedRate <= 25 && Math.abs(calculated - detected) <= 0.15) {
      return { amount: calculated, rate };
    }
  }
  return detected !== null ? { amount: detected, rate } : null;
}

function detectDescription(lines: string[]) {
  const merchantNames: Array<[RegExp, string]> = [
    [/star\s+tankstelle/i, "star Tankstelle"],
    [/clayton(?:\s+hotels?|\s+dublin)?/i, "Clayton Hotel Dublin Airport"],
    [/crafted(?:\s+kitchen)?/i, "Crafted Kitchen & Bar"],
    [/krimph[o0]ff/i, "KRIMPHOFF"],
    [/deep\s*l/i, "DeepL"]
  ];
  for (const [pattern, name] of merchantNames) {
    if (lines.some(line => pattern.test(line))) return name;
  }
  const ignored = /(kassenbon|rechnung|quittung|beleg|steuer|datum|uhrzeit|telefon|tel\.|www\.|straße|str\.|ust-id|eur|merchant id|kartenzahlung|mastercard)/i;
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

export function detectCategory(text: string) {
  const categories: Array<[RegExp, string]> = [
    [/(hotel|pension|übernachtung|zimmer|bed and breakfast)/i, "Hotel"],
    [/(parkhaus|parken|parking|parkgebühr)/i, "Parken"],
    [/(taxi|uber|bolt)/i, "Taxi"],
    [/(deutsche bahn|bahn|db fernverkehr|fahrkarte|ticket)/i, "Bahn"],
    [/(flug|airline|boarding|lufthansa|eurowings)/i, "Flug"],
    [/(tankstelle|diesel|benzin|super e\d|shell|aral|esso)/i, "Tanken"],
    [/(restaurant|gasthaus|café|cafe|bistro|bewirtung|kitchen|\bbar\b|sandwich|food)/i, "Bewirtung"]
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
  const vat = detectVat(lines, amount);
  const vat7Amount = vat?.rate === 7 ? vat.amount : null;
  const vat19Amount = vat?.rate === 19 ? vat.amount : null;
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

  const foundFields = [expenseDate, amount, description !== "Beleg", vat].filter(Boolean).length;
  const confidence = Math.round(Math.min(100, Math.max(0, ocrConfidence) * 0.6 + foundFields * 10));

  return {
    amount,
    category: detectCategory(text),
    confidence,
    description,
    expenseDate,
    vat7Amount,
    vat19Amount,
    documentType,
    warnings
  };
}

export type CardStatementItemSuggestion = {
  transactionDate: string | null;
  description: string;
  amount: number;
};

const CARD_STATEMENT_NOISE = /(kreditkartenabrechnung|abrechnung business card|abrechnungssaldo|umsatzdatum|buchungsdatum|verf[üu]gungsrahmen|summe|gesamt|saldo|übertrag|seite \d|kartennummer|gültig bis|iban|bic)/i;

export function extractCardStatementItems(text: string): CardStatementItemSuggestion[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const items: CardStatementItemSuggestion[] = [];
  for (const line of lines) {
    if (CARD_STATEMENT_NOISE.test(line)) continue;
    const amounts = moneyValues(line);
    if (!amounts.length) continue;
    const amount = amounts[amounts.length - 1];
    if (amount <= 0) continue;

    const dateMatch = line.match(/\b([0-3]?\d)\s*[.,/-]\s*([01]?\d)\s*[.,/-]\s*(20\d{2}|\d{2})\b/);
    let transactionDate: string | null = null;
    if (dateMatch) {
      const year = Number(dateMatch[3]) < 100 ? 2000 + Number(dateMatch[3]) : Number(dateMatch[3]);
      const month = Number(dateMatch[2]);
      const day = Number(dateMatch[1]);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
        transactionDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    const description = line
      .replace(dateMatch ? dateMatch[0] : "", "")
      .replace(/(?:€\s*|EUR\s*)?\d{1,5}(?:[.,\s]\d{3})*[,.]\d{2}\s*(?:€|EUR)?/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (description.length < 2) continue;
    items.push({ transactionDate, description, amount });
  }
  return items;
}

export function recognizeReceipt(image: Buffer) {
  return recognizeReceiptPages([image]);
}

export function recognizeCardStatementPages(images: Buffer[]) {
  if (!images.length) throw new Error("Keine Seiten vorhanden.");

  const job = recognitionQueue.then(async () => {
    const worker = await getWorker();
    try {
      const texts: string[] = [];
      for (const page of images) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            worker.recognize(page),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Zeitlimit der lokalen Belegerkennung überschritten.")),
                OCR_PAGE_TIMEOUT_MS
              );
            })
          ]);
          texts.push(result.data.text);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      return extractCardStatementItems(texts.join("\n"));
    } catch (error) {
      await discardWorker(worker);
      throw error;
    }
  });
  recognitionQueue = job.then(() => undefined, () => undefined);
  return job;
}

export function recognizeReceiptPages(
  images: Buffer[],
  detailImages: Buffer[] = [],
  fallbackImages: Buffer[] = []
) {
  if (!images.length) throw new Error("Keine Belegseiten vorhanden.");

  const job = recognitionQueue.then(async () => {
    const worker = await getWorker();
    try {
      const results = [];
      for (const page of images) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          results.push(await Promise.race([
            worker.recognize(page),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Zeitlimit der lokalen Belegerkennung überschritten.")),
                OCR_PAGE_TIMEOUT_MS
              );
            })
          ]));
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      const text = results.map(result => result.data.text).join("\n");
      const confidence =
        results.reduce((sum, result) => sum + result.data.confidence, 0) / results.length;
      const suggestion = extractReceiptSuggestion(text, confidence);

      if (detailImages.length) {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
        const detailResults = [];
        for (const page of detailImages) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            detailResults.push(await Promise.race([
              worker.recognize(page),
              new Promise<never>((_, reject) => {
                timeout = setTimeout(
                  () => reject(new Error("Zeitlimit der lokalen Belegerkennung überschritten.")),
                  OCR_PAGE_TIMEOUT_MS
                );
              })
            ]));
          } finally {
            if (timeout) clearTimeout(timeout);
          }
        }
        const detailText = detailResults.map(result => result.data.text).join("\n");
        const detailConfidence = detailResults.reduce(
          (sum, result) => sum + result.data.confidence,
          0
        ) / detailResults.length;
        let detailSuggestion = extractReceiptSuggestion(detailText, detailConfidence);
        if (fallbackImages.length && (
          (suggestion.amount === null && detailSuggestion.amount === null) ||
          (suggestion.expenseDate === null && detailSuggestion.expenseDate === null) ||
          (suggestion.description === "Beleg" && detailSuggestion.description === "Beleg")
        )) {
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
          const retryResults = [];
          for (const page of fallbackImages.length ? fallbackImages : detailImages) {
            retryResults.push(await worker.recognize(page));
          }
          const retryText = retryResults.map(result => result.data.text).join("\n");
          const retryConfidence = retryResults.reduce(
            (sum, result) => sum + result.data.confidence,
            0
          ) / retryResults.length;
          const retrySuggestion = extractReceiptSuggestion(retryText, retryConfidence);
          detailSuggestion = {
            ...detailSuggestion,
            amount: detailSuggestion.amount ?? retrySuggestion.amount,
            expenseDate: detailSuggestion.expenseDate ?? retrySuggestion.expenseDate,
            description: detailSuggestion.description === "Beleg" ? retrySuggestion.description : detailSuggestion.description,
            category: detailSuggestion.category === "Sonstiges" ? retrySuggestion.category : detailSuggestion.category,
            vat7Amount: detailSuggestion.vat7Amount ?? retrySuggestion.vat7Amount,
            vat19Amount: detailSuggestion.vat19Amount ?? retrySuggestion.vat19Amount
          };
        }
        if (suggestion.amount === null && detailSuggestion.amount !== null) {
          suggestion.amount = detailSuggestion.amount;
        }
        if (suggestion.expenseDate === null && detailSuggestion.expenseDate !== null) {
          suggestion.expenseDate = detailSuggestion.expenseDate;
        }
        if (suggestion.description === "Beleg" && detailSuggestion.description !== "Beleg") {
          suggestion.description = detailSuggestion.description;
        }
        if (suggestion.category === "Sonstiges" && detailSuggestion.category !== "Sonstiges") {
          suggestion.category = detailSuggestion.category;
        }
        if (suggestion.vat7Amount === null && detailSuggestion.vat7Amount !== null) {
          suggestion.vat7Amount = detailSuggestion.vat7Amount;
        }
        if (suggestion.vat19Amount === null && detailSuggestion.vat19Amount !== null) {
          suggestion.vat19Amount = detailSuggestion.vat19Amount;
        }
        suggestion.warnings = suggestion.warnings.filter(warning =>
          !(suggestion.expenseDate && warning.startsWith("Datum konnte")) &&
          !(suggestion.amount !== null && warning.startsWith("Gesamtbetrag konnte")) &&
          !(suggestion.description !== "Beleg" && warning.startsWith("Händler konnte")) &&
          !(suggestion.amount !== null && suggestion.amount <= 10000 && warning.startsWith("Der erkannte Betrag"))
        );
        await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      }

      return suggestion;
    } catch (error) {
      await discardWorker(worker);
      throw error;
    }
  });
  recognitionQueue = job.then(() => undefined, () => undefined);
  return job;
}
