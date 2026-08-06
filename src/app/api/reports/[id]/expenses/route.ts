import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validation";
import { ReceiptFileError, removeStoredFiles, storeUpload, validateReceiptFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });
  const { id } = await params;
  const report = await db.expenseReport.findUnique({ where: { id } });
  if (!report || report.employeeId !== user.id || !["DRAFT", "RETURNED"].includes(report.status)) {
    return NextResponse.json({ error: "Die Abrechnung darf nicht bearbeitet werden." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("files");
  try {
    validateReceiptFile(file);
    const rawEntry: unknown = JSON.parse(String(formData.get("entries") ?? "[]"));
    if (!Array.isArray(rawEntry) || rawEntry.length !== 1) {
      return NextResponse.json({ error: "Der Beleg konnte nicht eindeutig zugeordnet werden." }, { status: 400 });
    }
    const values = expenseSchema.parse(rawEntry[0]);
    if (report.accommodationMode === "PER_DIEM" && values.category === "Hotel") {
      return NextResponse.json({ error: "Bei Übernachtungspauschale kann kein Hotelbeleg erfasst werden." }, { status: 400 });
    }

    const upload = await storeUpload(file);
    try {
      await db.expenseItem.create({ data: { reportId: id, ...values, ...upload } });
    } catch (error) {
      await removeStoredFiles([upload.storedFileName]);
      throw error;
    }
    revalidatePath(`/reports/${id}`);
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof ReceiptFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const invalidValues = error instanceof Error && error.name === "ZodError";
    const message = invalidValues
      ? "Bitte Datum, Beschreibung, Betrag und Zahlungsart prüfen."
      : "Der Beleg konnte nicht gespeichert werden.";
    console.error("Beleg speichern fehlgeschlagen:", error);
    return NextResponse.json({ error: message }, { status: invalidValues ? 400 : 500 });
  }
}
