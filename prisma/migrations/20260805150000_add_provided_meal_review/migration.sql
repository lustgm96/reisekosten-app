ALTER TABLE "ExpenseReport" ADD COLUMN "providedMealsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ExpenseReport" ADD COLUMN "mealsReviewedAt" DATETIME;
