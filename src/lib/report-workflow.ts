import type { ReportStatus, Role } from "@prisma/client";

export function getCompletionError(role: Role, status: ReportStatus) {
  if (role !== "ADMIN") {
    return "Nur Admins dürfen Abrechnungen abschließen.";
  }
  if (status !== "APPROVED") {
    return "Nur freigegebene Abrechnungen können abgeschlossen werden.";
  }
  return null;
}
