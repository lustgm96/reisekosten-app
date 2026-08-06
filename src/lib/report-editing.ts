import type { ReportStatus } from "@prisma/client";

export const editableReportStatuses = ["DRAFT", "RETURNED"] as const satisfies readonly ReportStatus[];

export function isEditableReportStatus(status: ReportStatus) {
  return editableReportStatuses.some(editableStatus => editableStatus === status);
}

export function canEmployeeEditReport(
  employeeId: string,
  reportEmployeeId: string,
  status: ReportStatus
) {
  return employeeId === reportEmployeeId && isEditableReportStatus(status);
}
