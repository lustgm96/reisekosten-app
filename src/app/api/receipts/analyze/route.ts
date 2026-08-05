import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recognizeReceipt, recognizeReceiptPages } from "@/lib/receipt-recognition";
import { ReceiptFileError, validateReceiptFile } from "@/lib/storage";
import { renderPdfForOcr } from "@/lib/pdf-rendering";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." },
      { status: 401 }
    );
  }
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
  try {
    validateReceiptFile(file);
  } catch (error) {
    if (error instanceof ReceiptFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const suggestion =
      file.type === "application/pdf"
        ? await renderPdfForOcr(fileBuffer).then(({ images, detailImages, fallbackImages }) =>
            recognizeReceiptPages(images, detailImages, fallbackImages)
          )
        : await recognizeReceipt(fileBuffer);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Lokale Belegerkennung fehlgeschlagen:", error);
    const timedOut = error instanceof Error && error.message.includes("Zeitlimit");
    return NextResponse.json(
      { error: timedOut
        ? "Die Erkennung hat zu lange gedauert. Bitte Angaben manuell ergänzen."
        : "Der Beleg konnte nicht erkannt werden. Die Angaben können manuell erfasst werden." },
      { status: timedOut ? 504 : 500 }
    );
  }
}
