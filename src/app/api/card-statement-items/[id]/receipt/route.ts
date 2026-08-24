import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { currentUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReceiptFileError, readStoredFile, storeUpload, validateReceiptFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await db.cardStatementItem.findUnique({ where: { id }, include: { statement: true } });
  if (!item || !item.receiptStoredFileName) notFound();
  if (item.statement.employeeId !== user.id) notFound();

  const buffer = await readStoredFile(item.receiptStoredFileName);
  return new Response(Uint8Array.from(buffer), {
    headers: {
      "content-type": item.receiptMimeType || "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(item.receiptOriginalFileName || "beleg")}`,
      "cache-control": "private, no-store"
    }
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });
  const { id } = await params;
  const item = await db.cardStatementItem.findUnique({ where: { id }, include: { statement: true } });
  if (!item || item.statement.employeeId !== user.id) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }
  if (item.statement.isComplete) {
    return NextResponse.json({ error: "Diese Abrechnung ist bereits als vollständig markiert." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  try {
    validateReceiptFile(file);
    const upload = await storeUpload(file);
    await db.cardStatementItem.update({
      where: { id },
      data: {
        receiptType: "UPLOADED",
        receiptOriginalFileName: upload.originalFileName,
        receiptStoredFileName: upload.storedFileName,
        receiptMimeType: upload.mimeType
      }
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof ReceiptFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Beleg-Upload fehlgeschlagen:", error);
    return NextResponse.json({ error: "Der Beleg konnte nicht gespeichert werden." }, { status: 500 });
  }
}
