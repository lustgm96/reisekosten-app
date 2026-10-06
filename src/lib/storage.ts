import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const MAX_RECEIPT_FILES = 20;

const receiptMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

export class ReceiptFileError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReceiptFileError";
    this.status = status;
  }
}

function isFileUpload(value: unknown): value is File {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<File>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

export function validateReceiptFile(file: unknown): asserts file is File {
  if (!isFileUpload(file) || !file.size) {
    throw new ReceiptFileError("Bitte einen Beleg auswählen.", 400);
  }

  if (!receiptMimeTypes.has(file.type)) {
    throw new ReceiptFileError(
      "Erlaubt sind JPG, PNG, WebP und PDF.",
      415
    );
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    throw new ReceiptFileError("Die Datei darf maximal 10 MB groß sein.", 413);
  }
}

// Auf Vercel gibt es kein persistentes Dateisystem: Mit BLOB_READ_WRITE_TOKEN
// landen Belege in einem privaten Vercel-Blob-Store, sonst lokal auf der Platte.
// Beim Verbinden eines Stores kann Vercel ein Prefix vergeben (z. B. STORAGE_READ_WRITE_TOKEN).
const blobToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN ||
  Object.entries(process.env).find(([name, value]) => name.endsWith("_READ_WRITE_TOKEN") && value)?.[1];
const useBlobStorage = () => Boolean(blobToken());
const uploadDir = () => process.env.UPLOAD_DIR || "./storage/uploads";

async function writeStored(storedFileName: string, buffer: Buffer, contentType?: string) {
  try {
    if (useBlobStorage()) {
      await put(storedFileName, buffer, {
        access: "private",
        token: blobToken(),
        addRandomSuffix: false,
        contentType: contentType || "application/octet-stream"
      });
      return;
    }

    await fs.mkdir(uploadDir(), { recursive: true });
    await fs.writeFile(path.join(uploadDir(), storedFileName), buffer);
  } catch (error) {
    // Ursache sichtbar machen (z. B. fehlender Blob-Store), sonst bleibt es eine "500".
    const reason = error instanceof Error ? error.message : String(error);
    console.error("Beleg-Speicher fehlgeschlagen:", error);
    const hint = useBlobStorage()
      ? "Vercel Blob"
      : process.env.VERCEL ? "kein Blob-Store verbunden (BLOB_READ_WRITE_TOKEN fehlt)" : "Dateisystem";
    throw new ReceiptFileError(`Der Beleg konnte nicht abgelegt werden (${hint}): ${reason}`.slice(0, 300), 500);
  }
}

export async function storeUpload(file: File) {
  validateReceiptFile(file);

  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "");
  const storedFileName = `${crypto.randomUUID()}${extension}`;

  await writeStored(storedFileName, Buffer.from(await file.arrayBuffer()), file.type);

  return { originalFileName: file.name, storedFileName, mimeType: file.type };
}

export async function storeGeneratedFile(buffer: Buffer | Uint8Array, extension: string) {
  const storedFileName = `${crypto.randomUUID()}${extension}`;
  await writeStored(storedFileName, Buffer.from(buffer));
  return storedFileName;
}

export async function removeStoredFiles(storedFileNames: Array<string | null>) {
  const fileNames = storedFileNames
    .filter((name): name is string => Boolean(name))
    .map(name => path.basename(name));

  if (useBlobStorage()) {
    await Promise.allSettled(fileNames.map(fileName => del(fileName, { token: blobToken() })));
    return;
  }

  await Promise.allSettled(fileNames.map(fileName => fs.unlink(path.join(uploadDir(), fileName))));
}

export async function readStoredFile(storedFileName: string) {
  const fileName = path.basename(storedFileName);

  if (useBlobStorage()) {
    const result = await get(fileName, { access: "private", token: blobToken() });
    if (!result || result.statusCode !== 200) throw new Error("Datei nicht gefunden.");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  return fs.readFile(path.join(uploadDir(), fileName));
}
