import type { Prisma } from "@prisma/client";

export function formatProcessNumber(year: number, number: number) {
  return `RK-${year}-${String(number).padStart(4, "0")}`;
}

export async function nextProcessNumber(tx: Prisma.TransactionClient, createdAt = new Date()) {
  const year = createdAt.getFullYear();
  const sequence = await tx.reportNumberSequence.upsert({
    where: { year },
    create: { year, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } }
  });
  return formatProcessNumber(year, sequence.nextNumber - 1);
}

export function receiptDocumentTitle(
  processNumber: string,
  uploadedAt: Date,
  index: number
) {
  const uploadDate = uploadedAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  return `${processNumber} · Beleg ${String(index + 1).padStart(2, "0")} · Upload ${uploadDate}`;
}
