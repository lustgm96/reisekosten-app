import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await db.cardStatementItem.findUnique({ where: { id }, include: { statement: true, selfDeclaration: true } });
  if (!item || !item.selfDeclaration?.generatedPdfFileName) notFound();
  if (item.statement.employeeId !== user.id) notFound();

  const buffer = await readStoredFile(item.selfDeclaration.generatedPdfFileName);
  return new Response(Uint8Array.from(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "inline; filename=\"eigenbeleg.pdf\"",
      "cache-control": "private, no-store"
    }
  });
}
