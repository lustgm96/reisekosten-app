import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function storeUpload(file: File) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!allowed.has(file.type)) throw new Error("Erlaubt sind JPG, PNG, WEBP und PDF.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Die Datei darf maximal 10 MB groß sein.");

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
