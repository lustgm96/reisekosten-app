import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Prisma, PaymentType, ReportStatus } from "@prisma/client";
import type { NumericSettings } from "@/lib/calculation";
import { calculateReport } from "@/lib/calculation";
import type { PerDiemRate } from "@/lib/per-diem";
import { receiptDocumentTitle } from "@/lib/process-number";
import { createCanvas, loadImage } from "@napi-rs/canvas";

type PdfExpense = {
  amount: number | Prisma.Decimal;
  category: string;
  description: string;
  expenseDate: Date;
  paymentType: PaymentType;
  createdAt: Date;
  mimeType: string | null;
  storedFileName: string | null;
};

type PdfComment = {
  author: { name: string };
  createdAt: Date;
  text: string;
};

export type ReportPdfData = {
  accommodationMode: "ACTUAL" | "PER_DIEM" | "PROVIDED";
  approvedAt: Date | null;
  breakfasts: number;
  comments: PdfComment[];
  completedAt: Date | null;
  destination: string;
  dinners: number;
  employee: { name: string };
  endAt: Date;
  expenses: PdfExpense[];
  id: string;
  lunches: number;
  privateKilometers: number;
  perDiemOvernight: number | Prisma.Decimal;
  processNumber: string;
  purpose: string;
  startAt: Date;
  status: ReportStatus;
  title: string;
  transportType: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT = rgb(0.11, 0.15, 0.22);
const MUTED = rgb(0.38, 0.43, 0.5);
const PRIMARY = rgb(0.08, 0.28, 0.47);
const LIGHT = rgb(0.94, 0.96, 0.98);
const BORDER = rgb(0.82, 0.85, 0.89);
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("de-DE");
const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short"
});

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Eingereicht",
  APPROVED: "Freigegeben",
  RETURNED: "Zurückgegeben",
  COMPLETED: "Abgeschlossen"
};

const paymentLabels: Record<PaymentType, string> = {
  PRIVATE: "Privat",
  COMPANY_CARD: "Firmenkarte",
  CASH: "Bar"
};

const categoryLabels: Record<string, string> = {
  ACCOMMODATION: "Übernachtung",
  FLIGHT: "Flug",
  MEAL: "Bewirtung",
  OTHER: "Sonstiges",
  PARKING: "Parken",
  PUBLIC_TRANSPORT: "ÖPNV",
  TAXI: "Taxi"
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }
      let fragment = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(fragment + character, size) > maxWidth) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment += character;
        }
      }
      current = fragment;
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function createReportPdf(
  report: ReportPdfData,
  settings: NumericSettings,
  company: string,
  perDiemRate?: PerDiemRate
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 92, width: PAGE_WIDTH, height: 92, color: PRIMARY });
    page.drawText(company, { x: MARGIN, y: 809, size: 10, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Reisekostenabrechnung", {
      x: MARGIN,
      y: 776,
      size: 22,
      font: bold,
      color: rgb(1, 1, 1)
    });
    y = 724;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 52) addPage();
  };

  const sectionTitle = (title: string) => {
    ensureSpace(34);
    page.drawText(title, { x: MARGIN, y, size: 13, font: bold, color: PRIMARY });
    page.drawLine({
      start: { x: MARGIN, y: y - 7 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 7 },
      thickness: 0.8,
      color: BORDER
    });
    y -= 26;
  };

  const labelValue = (label: string, value: string, x: number, width: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: MUTED });
    const lines = wrapText(value || "-", regular, 10, width);
    lines.slice(0, 3).forEach((line, index) => {
      page.drawText(line, { x, y: y - 14 - index * 12, size: 10, font: regular, color: TEXT });
    });
    return 18 + Math.min(lines.length, 3) * 12;
  };

  addPage();
  const pillWidth = bold.widthOfTextAtSize(statusLabels[report.status], 9) + 32;
  page.drawRectangle({
    x: PAGE_WIDTH - MARGIN - pillWidth,
    y: 772,
    width: pillWidth,
    height: 24,
    color: rgb(1, 1, 1),
    opacity: 0.95
  });
  page.drawText(statusLabels[report.status], {
    x: PAGE_WIDTH - MARGIN - pillWidth + 16,
    y: 779,
    size: 9,
    font: bold,
    color: PRIMARY
  });

  sectionTitle("Reisedaten");
  let blockHeight = Math.max(
    labelValue("Mitarbeiter", report.employee.name, MARGIN, 238),
    labelValue("Abrechnung", report.title, MARGIN + 269, 238)
  );
  y -= blockHeight;
  blockHeight = Math.max(
    labelValue("Reisezweck", report.purpose, MARGIN, 238),
    labelValue("Reiseziel", report.destination, MARGIN + 269, 238)
  );
  y -= blockHeight;
  blockHeight = labelValue("Vorgangsnummer", report.processNumber, MARGIN, 238);
  y -= blockHeight;
  blockHeight = Math.max(
    labelValue("Zeitraum", `${dateTime.format(report.startAt)} bis ${dateTime.format(report.endAt)}`, MARGIN, 238),
    labelValue("Verkehrsmittel", report.transportType, MARGIN + 269, 238)
  );
  y -= blockHeight + 8;

  const drawExpenseHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 19, width: CONTENT_WIDTH, height: 25, color: LIGHT });
    const headers = [
      ["Datum", MARGIN + 7],
      ["Kategorie / Beschreibung", MARGIN + 75],
      ["Zahlung", MARGIN + 350],
      ["Betrag", MARGIN + 446]
    ] as const;
    headers.forEach(([text, x]) =>
      page.drawText(text, { x, y: y - 9, size: 8, font: bold, color: MUTED })
    );
    y -= 27;
  };

  sectionTitle("Ausgaben");
  drawExpenseHeader();
  if (!report.expenses.length) {
    page.drawText("Keine Ausgaben erfasst.", { x: MARGIN + 7, y: y - 10, size: 9, font: regular, color: MUTED });
    y -= 28;
  }
  for (const expense of report.expenses) {
    const documentTitle = receiptDocumentTitle(report.processNumber, expense.createdAt, report.expenses.indexOf(expense));
    const description = wrapText(`${expense.description || "-"}\n${documentTitle}`, regular, 8.5, 263);
    const rowHeight = Math.max(31, 27 + Math.max(0, description.length - 1) * 10);
    if (y - rowHeight < 52) {
      addPage();
      sectionTitle("Ausgaben (Fortsetzung)");
      drawExpenseHeader();
    }
    page.drawText(date.format(expense.expenseDate), { x: MARGIN + 7, y: y - 12, size: 8.5, font: regular, color: TEXT });
    page.drawText(categoryLabels[expense.category] ?? expense.category, { x: MARGIN + 75, y: y - 10, size: 8.5, font: bold, color: TEXT });
    description.forEach((line, index) =>
      page.drawText(line, { x: MARGIN + 75, y: y - 22 - index * 10, size: 8.5, font: regular, color: MUTED })
    );
    page.drawText(paymentLabels[expense.paymentType], { x: MARGIN + 350, y: y - 12, size: 8.5, font: regular, color: TEXT });
    const amount = eur.format(Number(expense.amount));
    page.drawText(amount, {
      x: PAGE_WIDTH - MARGIN - 7 - bold.widthOfTextAtSize(amount, 8.5),
      y: y - 12,
      size: 8.5,
      font: bold,
      color: TEXT
    });
    page.drawLine({
      start: { x: MARGIN, y: y - rowHeight + 2 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 2 },
      thickness: 0.5,
      color: BORDER
    });
    y -= rowHeight;
  }
  y -= 10;

  const totals = calculateReport(report, report.expenses, settings, perDiemRate);
  sectionTitle("Berechnung");
  const summaryRows: Array<[string, number, boolean?]> = [
    [`Verpflegung (${totals.days} Reisetag${totals.days === 1 ? "" : "e"})`, totals.mealBase],
    ["Abzug gestellter Mahlzeiten", -totals.mealDeductions],
    ["Verpflegungspauschale", totals.mealAllowance],
    [`Übernachtungspauschale (${totals.nights} Nächte)`, totals.lodgingAllowance],
    [`Kilometergeld (${report.privateKilometers.toLocaleString("de-DE")} km)`, totals.mileage],
    ["Privat ausgelegte Ausgaben", totals.privateExpenses],
    ["Bar ausgelegte Ausgaben", totals.cashExpenses],
    ["Ausgaben mit Firmenkarte", totals.companyCardExpenses],
    ["Erstattung an Mitarbeiter", totals.reimbursement, true],
    ["Gesamtkosten der Reise", totals.totalCosts, true]
  ];
  ensureSpace(summaryRows.length * 20 + 8);
  summaryRows.forEach(([label, value, emphasized], index) => {
    if (emphasized) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 14,
        width: CONTENT_WIDTH,
        height: 21,
        color: index === summaryRows.length - 1 ? PRIMARY : LIGHT
      });
    }
    const rowFont = emphasized ? bold : regular;
    const rowColor = index === summaryRows.length - 1 ? rgb(1, 1, 1) : TEXT;
    page.drawText(label, { x: MARGIN + 7, y: y - 8, size: 9, font: rowFont, color: rowColor });
    const valueText = eur.format(value);
    page.drawText(valueText, {
      x: PAGE_WIDTH - MARGIN - 7 - rowFont.widthOfTextAtSize(valueText, 9),
      y: y - 8,
      size: 9,
      font: rowFont,
      color: rowColor
    });
    y -= 21;
  });
  y -= 8;

  if (report.approvedAt) {
    sectionTitle("Freigabe");
    ensureSpace(36);
    page.drawText(`Digital freigegeben am ${dateTime.format(report.approvedAt)}`, {
      x: MARGIN + 7,
      y: y - 8,
      size: 9,
      font: bold,
      color: TEXT
    });
    y -= 32;
  }

  if (report.completedAt) {
    ensureSpace(28);
    page.drawText(`Ausgezahlt und abgeschlossen am ${dateTime.format(report.completedAt)}`, {
      x: MARGIN + 7,
      y: y - 8,
      size: 9,
      font: bold,
      color: TEXT
    });
    y -= 28;
  }

  if (report.comments.length) {
    sectionTitle("Kommentare");
    for (const comment of report.comments) {
      const lines = wrapText(comment.text, regular, 9, CONTENT_WIDTH - 14);
      const height = 29 + lines.length * 11;
      ensureSpace(height);
      page.drawText(`${comment.author.name} - ${dateTime.format(comment.createdAt)}`, {
        x: MARGIN + 7,
        y: y - 8,
        size: 8,
        font: bold,
        color: MUTED
      });
      lines.forEach((line, index) =>
        page.drawText(line, { x: MARGIN + 7, y: y - 23 - index * 11, size: 9, font: regular, color: TEXT })
      );
      y -= height;
    }
  }

  const generatedAt = dateTime.format(new Date());
  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: MARGIN, y: 39 },
      end: { x: PAGE_WIDTH - MARGIN, y: 39 },
      thickness: 0.5,
      color: BORDER
    });
    currentPage.drawText(`Erstellt am ${generatedAt}`, {
      x: MARGIN,
      y: 24,
      size: 7.5,
      font: regular,
      color: MUTED
    });
    const pageNumber = `Seite ${index + 1} von ${pages.length}`;
    currentPage.drawText(pageNumber, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageNumber, 7.5),
      y: 24,
      size: 7.5,
      font: regular,
      color: MUTED
    });
  });

  pdf.setTitle(`${report.processNumber} - ${report.title}`);
  pdf.setAuthor(company);
  pdf.setSubject(`Reisekostenabrechnung von ${report.employee.name}`);
  return pdf.save();
}

export type ReceiptAttachment = {
  bytes: Buffer;
  createdAt: Date;
  documentIndex: number;
  mimeType: string;
};

export async function appendReceiptsToReportPdf(
  summaryBytes: Uint8Array,
  processNumber: string,
  attachments: ReceiptAttachment[]
) {
  const output = await PDFDocument.load(summaryBytes);
  const regular = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);

  for (const attachment of attachments) {
    const title = receiptDocumentTitle(processNumber, attachment.createdAt, attachment.documentIndex);
    try {
      if (attachment.mimeType === "application/pdf") {
        const source = await PDFDocument.load(attachment.bytes);
        for (const sourcePage of source.getPages()) {
          const embedded = await output.embedPage(sourcePage);
          const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          page.drawText(title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
          const scale = Math.min(CONTENT_WIDTH / embedded.width, 748 / embedded.height);
          page.drawPage(embedded, {
            x: (PAGE_WIDTH - embedded.width * scale) / 2,
            y: 38,
            width: embedded.width * scale,
            height: embedded.height * scale
          });
        }
        continue;
      }

      let imageBytes: Uint8Array = attachment.bytes;
      let imageType = attachment.mimeType;
      if (imageType === "image/webp") {
        const sourceImage = await loadImage(attachment.bytes);
        const canvas = createCanvas(sourceImage.width, sourceImage.height);
        canvas.getContext("2d").drawImage(sourceImage, 0, 0);
        imageBytes = canvas.toBuffer("image/png");
        imageType = "image/png";
      }
      const embedded = imageType === "image/png"
        ? await output.embedPng(imageBytes)
        : await output.embedJpg(imageBytes);
      const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
      const scale = Math.min(CONTENT_WIDTH / embedded.width, 748 / embedded.height, 1);
      page.drawImage(embedded, {
        x: (PAGE_WIDTH - embedded.width * scale) / 2,
        y: 38 + (748 - embedded.height * scale) / 2,
        width: embedded.width * scale,
        height: embedded.height * scale
      });
    } catch {
      const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
      page.drawText("Der gespeicherte Beleg konnte nicht in die Sammel-PDF eingebettet werden.", {
        x: MARGIN,
        y: 760,
        size: 10,
        font: regular,
        color: TEXT
      });
    }
  }

  return output.save();
}
