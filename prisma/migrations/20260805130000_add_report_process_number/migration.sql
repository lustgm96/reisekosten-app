ALTER TABLE "ExpenseReport" ADD COLUMN "processNumber" TEXT;

UPDATE "ExpenseReport" AS current
SET "processNumber" = 'RK-' ||
  strftime('%Y', current."createdAt" / 1000, 'unixepoch') || '-' ||
  printf('%04d', (
    SELECT COUNT(*)
    FROM "ExpenseReport" AS earlier
    WHERE strftime('%Y', earlier."createdAt" / 1000, 'unixepoch') = strftime('%Y', current."createdAt" / 1000, 'unixepoch')
      AND (earlier."createdAt" < current."createdAt" OR (earlier."createdAt" = current."createdAt" AND earlier."id" <= current."id"))
  ));

CREATE UNIQUE INDEX "ExpenseReport_processNumber_key" ON "ExpenseReport"("processNumber");

CREATE TABLE "ReportNumberSequence" (
  "year" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nextNumber" INTEGER NOT NULL
);

INSERT INTO "ReportNumberSequence" ("year", "nextNumber")
SELECT
  CAST(strftime('%Y', "createdAt" / 1000, 'unixepoch') AS INTEGER),
  COUNT(*) + 1
FROM "ExpenseReport"
GROUP BY strftime('%Y', "createdAt" / 1000, 'unixepoch');
