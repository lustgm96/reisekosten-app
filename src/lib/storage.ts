import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

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

export function validateReceiptFile(file: unknown): asserts file is File {
  if (!(file instanceof File) || !file.size) {
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

export async function storeUpload(file: File) {
  validateReceiptFile(file);

  const uploadDir = process.env.UPLOAD_DIR || "./storage/uploads";
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "");
  const storedFileName = `${crypto.randomUUID()}${extension}`;

  await fs.writeFile(path.join(uploadDir, storedFileName), Buffer.from(await file.arrayBuffer()));

  return { originalFileName: file.name, storedFileName, mimeType: file.type };
}

export async function removeStoredFiles(storedFileNames: Array<string | null>) {
  const uploadDir = process.env.UPLOAD_DIR || "./storage/uploads";
  const fileNames = storedFileNames.filter((name): name is string => Boolean(name));

  await Promise.allSettled(
    fileNames.map(fileName => fs.unlink(path.join(uploadDir, path.basename(fileName))))
  );
}
