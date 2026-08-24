import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyName } from "@/lib/settings";
import { appendCardStatementAttachments, createCardStatementSummaryPdf } from "@/lib/card-statement-pdf";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const statement = await db.cardStatement.findUnique({
    where: { id },
    include: { employee: true, items: { include: { selfDeclaration: true }, orderBy: { transactionDate: "asc" } } }
  });
  if (!statement) notFound();
  if (statement.employeeId !== user.id) notFound();

  const summary = await createCardStatementSummaryPdf(
    {
      employeeName: statement.employee.name,
      year: statement.year,
      month: statement.month,
      items: statement.items.map(item => ({
        transactionDate: item.transactionDate,
        category: item.category,
        description: item.description,
        amount: item.amount,
        receiptType: item.receiptType
      }))
    },
    await getCompanyName()
  );

  const attachments = [];
  for (const item of statement.items) {
    if (item.receiptType === "UPLOADED" && item.receiptStoredFileName && item.receiptMimeType) {
      attachments.push({
        bytes: await readStoredFile(item.receiptStoredFileName),
        mimeType: item.receiptMimeType,
        title: `${item.category} · ${item.description}`
      });
    } else if (item.selfDeclaration?.generatedPdfFileName) {
      attachments.push({
        bytes: await readStoredFile(item.selfDeclaration.generatedPdfFileName),
        mimeType: "application/pdf",
        title: `Eigenbeleg · ${item.category} · ${item.description}`
      });
    }
  }

  const bytes = await appendCardStatementAttachments(summary, attachments);
  return new Response(Uint8Array.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="Kreditkartenabrechnung-${statement.year}-${String(statement.month).padStart(2, "0")}.pdf"`
    }
  });
}
