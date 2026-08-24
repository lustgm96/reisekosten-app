/*
  Warnings:

  - Made the column `processNumber` on table `ExpenseReport` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExpenseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "exchangeRate" DECIMAL NOT NULL DEFAULT 1,
    "vatAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExpenseReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseItem" ("amount", "category", "createdAt", "description", "expenseDate", "id", "mimeType", "originalFileName", "paymentType", "reportId", "storedFileName", "vatAmount") SELECT "amount", "category", "createdAt", "description", "expenseDate", "id", "mimeType", "originalFileName", "paymentType", "reportId", "storedFileName", "vatAmount" FROM "ExpenseItem";
DROP TABLE "ExpenseItem";
ALTER TABLE "new_ExpenseItem" RENAME TO "ExpenseItem";
CREATE INDEX "ExpenseItem_reportId_expenseDate_idx" ON "ExpenseItem"("reportId", "expenseDate");
CREATE TABLE "new_ExpenseReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processNumber" TEXT NOT NULL,
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
    "providedMealsJson" TEXT NOT NULL DEFAULT '[]',
    "mealsReviewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseReport" ("accommodationMode", "approvedAt", "breakfasts", "completedAt", "countryCode", "createdAt", "destination", "dinners", "employeeId", "endAt", "id", "lunches", "mealsReviewedAt", "perDiemCode", "perDiemFullDay", "perDiemOvernight", "perDiemPartialDay", "privateKilometers", "processNumber", "providedMealsJson", "purpose", "startAt", "status", "submittedAt", "title", "transportType", "updatedAt") SELECT "accommodationMode", "approvedAt", "breakfasts", "completedAt", "countryCode", "createdAt", "destination", "dinners", "employeeId", "endAt", "id", "lunches", "mealsReviewedAt", "perDiemCode", "perDiemFullDay", "perDiemOvernight", "perDiemPartialDay", "privateKilometers", "processNumber", "providedMealsJson", "purpose", "startAt", "status", "submittedAt", "title", "transportType", "updatedAt" FROM "ExpenseReport";
DROP TABLE "ExpenseReport";
ALTER TABLE "new_ExpenseReport" RENAME TO "ExpenseReport";
CREATE UNIQUE INDEX "ExpenseReport_processNumber_key" ON "ExpenseReport"("processNumber");
CREATE INDEX "ExpenseReport_employeeId_status_idx" ON "ExpenseReport"("employeeId", "status");
CREATE INDEX "ExpenseReport_startAt_endAt_idx" ON "ExpenseReport"("startAt", "endAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
