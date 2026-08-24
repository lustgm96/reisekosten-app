import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardStatementItemSchema } from "@/lib/validation";
import { ReceiptFileError, storeUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });
  const { id } = await params;
  const statement = await db.cardStatement.findUnique({ where: { id } });
  if (!statement || statement.employeeId !== user.id) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }
  if (statement.isComplete) {
    return NextResponse.json({ error: "Diese Abrechnung ist bereits als vollständig markiert." }, { status: 400 });
  }

  const formData = await request.formData();
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Ungültige Positionsdaten." }, { status: 400 });
  }
  if (!Array.isArray(rawItems) || !rawItems.length) {
    return NextResponse.json({ error: "Bitte mindestens eine Position übergeben." }, { status: 400 });
  }

  let values;
  try {
    values = rawItems.map(item => cardStatementItemSchema.parse(item));
  } catch {
    return NextResponse.json({ error: "Bitte Datum, Kategorie, Beschreibung und Betrag jeder Position prüfen." }, { status: 400 });
  }

  const file = formData.get("file");
  if (file instanceof File && file.size) {
    try {
      const upload = await storeUpload(file);
      await db.cardStatement.update({ where: { id }, data: upload });
    } catch (error) {
      if (!(error instanceof ReceiptFileError)) throw error;
    }
  }

  await db.cardStatementItem.createMany({
    data: values.map(value => ({ statementId: id, ...value }))
  });

  return NextResponse.json({ saved: values.length });
}
