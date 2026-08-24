export const cardStatementCategories = ["Hotel", "Bewirtung", "Parken", "Taxi", "Bahn", "Flug", "Tanken", "Sonstiges"] as const;

type ItemDocumentation = {
  receiptType: "UPLOADED" | "SELF_DECLARATION";
  receiptStoredFileName: string | null;
  selfDeclaration: { generatedPdfFileName: string | null } | null;
};

export function isItemDocumented(item: ItemDocumentation) {
  if (item.receiptType === "UPLOADED") return Boolean(item.receiptStoredFileName);
  return Boolean(item.selfDeclaration?.generatedPdfFileName);
}

export function undocumentedItemCount(items: ItemDocumentation[]) {
  return items.filter(item => !isItemDocumented(item)).length;
}

export function getCompletionError(items: ItemDocumentation[]) {
  if (!items.length) return "Bitte mindestens eine Position erfassen.";
  const missing = undocumentedItemCount(items);
  if (missing > 0) {
    return `${missing} Position${missing === 1 ? "" : "en"} ${missing === 1 ? "hat" : "haben"} noch keinen Beleg oder Eigenbeleg.`;
  }
  return null;
}
