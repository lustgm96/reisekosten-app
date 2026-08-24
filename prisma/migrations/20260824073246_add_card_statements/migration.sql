-- CreateTable
CREATE TABLE "CardStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "mimeType" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardStatement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardStatementItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "transactionDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "vatAmount" DECIMAL NOT NULL DEFAULT 0,
    "receiptType" TEXT NOT NULL DEFAULT 'UPLOADED',
    "receiptOriginalFileName" TEXT,
    "receiptStoredFileName" TEXT,
    "receiptMimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardStatementItem_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "CardStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SelfDeclaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "businessContext" TEXT NOT NULL,
    "proofReference" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declarantName" TEXT NOT NULL,
    "signatureStoredFileName" TEXT NOT NULL,
    "signatureMimeType" TEXT NOT NULL DEFAULT 'image/png',
    "confirmedAt" DATETIME NOT NULL,
    "generatedPdfFileName" TEXT,
    CONSTRAINT "SelfDeclaration_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CardStatementItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CardStatement_employeeId_year_month_key" ON "CardStatement"("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "CardStatementItem_statementId_transactionDate_idx" ON "CardStatementItem"("statementId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SelfDeclaration_itemId_key" ON "SelfDeclaration"("itemId");
