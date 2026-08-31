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
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "vat7Amount" DECIMAL NOT NULL DEFAULT 0,
    "vat19Amount" DECIMAL NOT NULL DEFAULT 0,
    "tip" DECIMAL NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "mimeType" TEXT,
    "notes" TEXT,
    "bewirtungKunde" TEXT,
    "bewirtungTeilnehmer" TEXT,
    "bewirtungAnlass" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ExpenseReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Data migration: existing single vatAmount is carried over as the 19% share (the standard German rate),
-- netAmount is backfilled as amount - vatAmount, tip defaults to 0 since it did not exist before.
INSERT INTO "new_ExpenseItem" ("id", "reportId", "expenseDate", "category", "description", "amount", "currency", "exchangeRate", "netAmount", "vat7Amount", "vat19Amount", "tip", "paymentType", "originalFileName", "storedFileName", "mimeType", "notes", "bewirtungKunde", "bewirtungTeilnehmer", "bewirtungAnlass", "createdAt")
SELECT "id", "reportId", "expenseDate", "category", "description", "amount", "currency", "exchangeRate", ("amount" - "vatAmount") AS "netAmount", 0 AS "vat7Amount", "vatAmount" AS "vat19Amount", 0 AS "tip", "paymentType", "originalFileName", "storedFileName", "mimeType", "notes", "bewirtungKunde", "bewirtungTeilnehmer", "bewirtungAnlass", "createdAt"
FROM "ExpenseItem";
DROP TABLE "ExpenseItem";
ALTER TABLE "new_ExpenseItem" RENAME TO "ExpenseItem";
CREATE INDEX "ExpenseItem_reportId_expenseDate_idx" ON "ExpenseItem"("reportId", "expenseDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
