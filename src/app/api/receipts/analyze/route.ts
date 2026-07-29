import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recognizeReceipt } from "@/lib/receipt-recognition";

export const runtime = "nodejs";
export const maxDuration = 60;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const reportId = String(formData.get("reportId") ?? "");
  const file = formData.get("file");

  const report = await db.expenseReport.findUnique({ where: { id: reportId } });
  if (
    !report ||
    report.employeeId !== user.id ||
    !["DRAFT", "RETURNED"].includes(report.status)
  ) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ error: "Bitte einen Beleg auswählen." }, { status: 400 });
  }
  if (!imageTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Die automatische Erkennung unterstützt zunächst JPG, PNG und WebP. PDF kann weiterhin manuell erfasst werden." },
      { status: 415 }
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Die Datei darf maximal 10 MB groß sein." }, { status: 413 });
  }

  try {
    const suggestion = await recognizeReceipt(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Lokale Belegerkennung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Der Beleg konnte nicht erkannt werden. Die Angaben können manuell erfasst werden." },
      { status: 500 }
    );
  }
}
