import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { selfDeclarationSchema } from "@/lib/validation";
import { createSelfDeclarationPdf } from "@/lib/card-statement-pdf";
import { removeStoredFiles, storeGeneratedFile, storeUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });
  const { id } = await params;
  const item = await db.cardStatementItem.findUnique({ where: { id }, include: { statement: true, selfDeclaration: true } });
  if (!item || item.statement.employeeId !== user.id) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }
  if (item.statement.isComplete) {
    return NextResponse.json({ error: "Diese Abrechnung ist bereits als vollständig markiert." }, { status: 400 });
  }

  const formData = await request.formData();
  let values;
  try {
    values = selfDeclarationSchema.parse(Object.fromEntries(formData));
  } catch {
    return NextResponse.json({ error: "Bitte alle Pflichtangaben zum Eigenbeleg prüfen." }, { status: 400 });
  }

  const signature = formData.get("signature");
  if (!(signature instanceof File) || !signature.size) {
    return NextResponse.json({ error: "Bitte den Eigenbeleg unterschreiben." }, { status: 400 });
  }
  if (signature.type !== "image/png") {
    return NextResponse.json({ error: "Die Unterschrift muss als PNG übertragen werden." }, { status: 400 });
  }

  const signatureUpload = await storeUpload(signature);
  const confirmedAt = new Date();

  try {
    const pdfBytes = await createSelfDeclarationPdf({
      transactionDate: item.transactionDate,
      description: item.description,
      businessContext: values.businessContext,
      payeeName: values.payeeName,
      payeeAddress: values.payeeAddress,
      amount: item.amount,
      proofReference: values.proofReference || null,
      issuedAt: confirmedAt,
      declarantName: values.declarantName,
      signaturePng: Buffer.from(await signature.arrayBuffer())
    });
    const generatedPdfFileName = await storeGeneratedFile(Buffer.from(pdfBytes), ".pdf");

    const previousSignature = item.selfDeclaration?.signatureStoredFileName ?? null;
    const previousPdf = item.selfDeclaration?.generatedPdfFileName ?? null;

    await db.cardStatementItem.update({
      where: { id },
      data: {
        receiptType: "SELF_DECLARATION",
        vatAmount: 0,
        selfDeclaration: {
          upsert: {
            create: {
              payeeName: values.payeeName,
              payeeAddress: values.payeeAddress,
              businessContext: values.businessContext,
              proofReference: values.proofReference || null,
              declarantName: values.declarantName,
              signatureStoredFileName: signatureUpload.storedFileName,
              confirmedAt,
              generatedPdfFileName
            },
            update: {
              payeeName: values.payeeName,
              payeeAddress: values.payeeAddress,
              businessContext: values.businessContext,
              proofReference: values.proofReference || null,
              declarantName: values.declarantName,
              signatureStoredFileName: signatureUpload.storedFileName,
              confirmedAt,
              generatedPdfFileName
            }
          }
        }
      }
    });

    await removeStoredFiles([previousSignature, previousPdf]);
    return NextResponse.json({ saved: true });
  } catch (error) {
    await removeStoredFiles([signatureUpload.storedFileName]);
    console.error("Eigenbeleg konnte nicht gespeichert werden:", error);
    return NextResponse.json({ error: "Der Eigenbeleg konnte nicht gespeichert werden." }, { status: 500 });
  }
}
