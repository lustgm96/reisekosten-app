import type { ReportStatus } from "@prisma/client";

const labels: Record<ReportStatus, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "In Prüfung",
  RETURNED: "Zurückgegeben",
  APPROVED: "Freigegeben",
  COMPLETED: "Abgeschlossen"
};

const classes: Partial<Record<ReportStatus, string>> = {
  RETURNED: "warn",
  APPROVED: "ok",
  COMPLETED: "ok"
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge ${classes[status] || ""}`}>{labels[status]}</span>;
}
