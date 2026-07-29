-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExpenseReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'DE',
    "perDiemCode" TEXT NOT NULL DEFAULT 'DE',
    "perDiemFullDay" DECIMAL NOT NULL DEFAULT 28,
    "perDiemPartialDay" DECIMAL NOT NULL DEFAULT 14,
    "perDiemOvernight" DECIMAL NOT NULL DEFAULT 20,
    "accommodationMode" TEXT NOT NULL DEFAULT 'ACTUAL',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "transportType" TEXT NOT NULL,
    "privateKilometers" REAL NOT NULL DEFAULT 0,
    "breakfasts" INTEGER NOT NULL DEFAULT 0,
    "lunches" INTEGER NOT NULL DEFAULT 0,
    "dinners" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseReport" ("approvedAt", "breakfasts", "completedAt", "countryCode", "createdAt", "destination", "dinners", "employeeId", "endAt", "id", "lunches", "perDiemCode", "perDiemFullDay", "perDiemPartialDay", "privateKilometers", "purpose", "startAt", "status", "submittedAt", "title", "transportType", "updatedAt") SELECT "approvedAt", "breakfasts", "completedAt", "countryCode", "createdAt", "destination", "dinners", "employeeId", "endAt", "id", "lunches", "perDiemCode", "perDiemFullDay", "perDiemPartialDay", "privateKilometers", "purpose", "startAt", "status", "submittedAt", "title", "transportType", "updatedAt" FROM "ExpenseReport";
DROP TABLE "ExpenseReport";
ALTER TABLE "new_ExpenseReport" RENAME TO "ExpenseReport";
CREATE INDEX "ExpenseReport_employeeId_status_idx" ON "ExpenseReport"("employeeId", "status");
CREATE INDEX "ExpenseReport_startAt_endAt_idx" ON "ExpenseReport"("startAt", "endAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
