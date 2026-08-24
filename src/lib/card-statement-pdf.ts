import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { createCanvas, loadImage } from "@napi-rs/canvas";

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
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export type SelfDeclarationPdfData = {
  transactionDate: Date;
  description: string;
  businessContext: string;
  payeeName: string;
  payeeAddress: string;
  amount: number | Prisma.Decimal;
  proofReference: string | null;
  issuedAt: Date;
  declarantName: string;
  signaturePng: Buffer;
};

export async function createSelfDeclarationPdf(data: SelfDeclarationPdfData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 60;

  page.drawText("Eigenbeleg", { x: MARGIN, y, size: 20, font: bold, color: PRIMARY });
  y -= 16;
  page.drawText("Ersetzt keinen Originalbeleg, kein Vorsteuerabzug.", { x: MARGIN, y, size: 9, font: regular, color: MUTED });
  y -= 30;

  const row = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 7.5, font: bold, color: MUTED });
    const lines = wrapText(value || "-", regular, 10.5, CONTENT_WIDTH);
    lines.forEach((line, index) => {
      page.drawText(line, { x: MARGIN, y: y - 14 - index * 13, size: 10.5, font: regular, color: TEXT });
    });
    y -= 18 + lines.length * 13 + 8;
  };

  row("Datum der Ausgabe", date.format(data.transactionDate));
  row("Gegenstand und geschäftlicher Zusammenhang", data.description ? `${data.description} - ${data.businessContext}` : data.businessContext);
  row("Zahlungsempfänger", `${data.payeeName}, ${data.payeeAddress}`);
  row("Betrag", eur.format(Number(data.amount)));
  if (data.proofReference) row("Glaubhaftmachung", data.proofReference);
  row("Ausstellungsdatum", date.format(data.issuedAt));
  row("Erstellt von", data.declarantName);

  y -= 10;
  page.drawText("Unterschrift", { x: MARGIN, y, size: 7.5, font: bold, color: MUTED });
  y -= 90;
  try {
    const embedded = await pdf.embedPng(data.signaturePng);
    const scale = Math.min(200 / embedded.width, 80 / embedded.height, 1);
    page.drawImage(embedded, { x: MARGIN, y, width: embedded.width * scale, height: embedded.height * scale });
  } catch {
    page.drawText("(Signatur konnte nicht eingebettet werden)", { x: MARGIN, y: y + 30, size: 9, font: regular, color: MUTED });
  }
  page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: MARGIN + 220, y: y - 4 }, thickness: 0.8, color: BORDER });
  page.drawText(`${data.declarantName} - bestätigt am ${dateTime.format(data.issuedAt)}`, {
    x: MARGIN, y: y - 18, size: 8, font: regular, color: MUTED
  });

  pdf.setTitle("Eigenbeleg");
  pdf.setAuthor(data.declarantName);
  return pdf.save();
}

export type CardStatementPdfItem = {
  transactionDate: Date;
  category: string;
  description: string;
  amount: number | Prisma.Decimal;
  receiptType: "UPLOADED" | "SELF_DECLARATION";
};

export type CardStatementPdfData = {
  employeeName: string;
  year: number;
  month: number;
  items: CardStatementPdfItem[];
};

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export async function createCardStatementSummaryPdf(data: CardStatementPdfData, company: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 92, width: PAGE_WIDTH, height: 92, color: PRIMARY });
    page.drawText(company, { x: MARGIN, y: 809, size: 10, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Kreditkartenabrechnung", { x: MARGIN, y: 776, size: 22, font: bold, color: rgb(1, 1, 1) });
    y = 724;
  };

  addPage();
  page.drawText(`${data.employeeName} - ${MONTH_NAMES[data.month - 1]} ${data.year}`, { x: MARGIN, y, size: 12, font: bold, color: TEXT });
  y -= 30;

  const header = () => {
    page.drawRectangle({ x: MARGIN, y: y - 19, width: CONTENT_WIDTH, height: 25, color: LIGHT });
    const headers = [["Datum", MARGIN + 7], ["Kategorie / Beschreibung", MARGIN + 75], ["Beleg", MARGIN + 380], ["Betrag", MARGIN + 460]] as const;
    headers.forEach(([text, x]) => page.drawText(text, { x, y: y - 9, size: 8, font: bold, color: MUTED }));
    y -= 27;
  };
  header();

  let total = 0;
  for (const item of data.items) {
    total += Number(item.amount);
    const descriptionLines = wrapText(item.description, regular, 8.5, 295);
    const rowHeight = Math.max(28, 18 + descriptionLines.length * 10);
    if (y - rowHeight < 52) { addPage(); header(); }
    page.drawText(date.format(item.transactionDate), { x: MARGIN + 7, y: y - 12, size: 8.5, font: regular, color: TEXT });
    page.drawText(item.category, { x: MARGIN + 75, y: y - 10, size: 8.5, font: bold, color: TEXT });
    descriptionLines.forEach((line, index) => page.drawText(line, { x: MARGIN + 75, y: y - 22 - index * 10, size: 8.5, font: regular, color: MUTED }));
    page.drawText(item.receiptType === "SELF_DECLARATION" ? "Eigenbeleg" : "Beleg", { x: MARGIN + 380, y: y - 12, size: 8.5, font: regular, color: TEXT });
    const amountText = eur.format(Number(item.amount));
    page.drawText(amountText, { x: PAGE_WIDTH - MARGIN - 7 - bold.widthOfTextAtSize(amountText, 8.5), y: y - 12, size: 8.5, font: bold, color: TEXT });
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 2 }, thickness: 0.5, color: BORDER });
    y -= rowHeight;
  }

  y -= 6;
  if (y < 60) { addPage(); }
  page.drawRectangle({ x: MARGIN, y: y - 14, width: CONTENT_WIDTH, height: 21, color: PRIMARY });
  page.drawText("Gesamtsumme", { x: MARGIN + 7, y: y - 8, size: 9, font: bold, color: rgb(1, 1, 1) });
  const totalText = eur.format(total);
  page.drawText(totalText, { x: PAGE_WIDTH - MARGIN - 7 - bold.widthOfTextAtSize(totalText, 9), y: y - 8, size: 9, font: bold, color: rgb(1, 1, 1) });

  const generatedAt = dateTime.format(new Date());
  pdf.getPages().forEach((currentPage, index, pages) => {
    currentPage.drawText(`Erstellt am ${generatedAt}`, { x: MARGIN, y: 24, size: 7.5, font: regular, color: MUTED });
    const pageNumber = `Seite ${index + 1} von ${pages.length}`;
    currentPage.drawText(pageNumber, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageNumber, 7.5), y: 24, size: 7.5, font: regular, color: MUTED });
  });

  pdf.setTitle(`Kreditkartenabrechnung ${data.month}/${data.year} - ${data.employeeName}`);
  pdf.setAuthor(company);
  return pdf.save();
}

export type CardStatementAttachment = {
  bytes: Buffer;
  mimeType: string;
  title: string;
};

export async function appendCardStatementAttachments(summaryBytes: Uint8Array, attachments: CardStatementAttachment[]) {
  const output = await PDFDocument.load(summaryBytes);
  const regular = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);

  for (const attachment of attachments) {
    try {
      if (attachment.mimeType === "application/pdf") {
        const source = await PDFDocument.load(attachment.bytes);
        for (const sourcePage of source.getPages()) {
          const embedded = await output.embedPage(sourcePage);
          const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          page.drawText(attachment.title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
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
      const embedded = imageType === "image/png" ? await output.embedPng(imageBytes) : await output.embedJpg(imageBytes);
      const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(attachment.title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
      const scale = Math.min(CONTENT_WIDTH / embedded.width, 748 / embedded.height, 1);
      page.drawImage(embedded, {
        x: (PAGE_WIDTH - embedded.width * scale) / 2,
        y: 38 + (748 - embedded.height * scale) / 2,
        width: embedded.width * scale,
        height: embedded.height * scale
      });
    } catch {
      const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(attachment.title, { x: MARGIN, y: 810, size: 11, font: bold, color: PRIMARY });
      page.drawText("Der gespeicherte Beleg konnte nicht in die Sammel-PDF eingebettet werden.", { x: MARGIN, y: 760, size: 10, font: regular, color: TEXT });
    }
  }

  return output.save();
}
