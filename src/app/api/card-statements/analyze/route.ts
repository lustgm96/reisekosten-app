import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { recognizeCardStatementPages } from "@/lib/receipt-recognition";
import { ReceiptFileError, validateReceiptFile } from "@/lib/storage";
import { renderPdfForOcr } from "@/lib/pdf-rendering";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
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
    const images = file.type === "application/pdf"
      ? (await renderPdfForOcr(fileBuffer)).images
      : [fileBuffer];
    const items = await recognizeCardStatementPages(images);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Analyse der Kartenabrechnung fehlgeschlagen:", error);
    const timedOut = error instanceof Error && error.message.includes("Zeitlimit");
    return NextResponse.json(
      { error: timedOut
        ? "Die Erkennung hat zu lange gedauert. Bitte Positionen manuell erfassen."
        : "Die Abrechnung konnte nicht automatisch gelesen werden. Bitte Positionen manuell erfassen." },
      { status: timedOut ? 504 : 500 }
    );
  }
}
