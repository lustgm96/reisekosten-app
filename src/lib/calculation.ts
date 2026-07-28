import type { ExpenseItem, ExpenseReport } from "@prisma/client";

export type NumericSettings = Record<string, number>;

export function calculateReport(
  report: ExpenseReport,
  expenses: ExpenseItem[],
  settings: NumericSettings
) {
  const startDay = new Date(report.startAt.getFullYear(), report.startAt.getMonth(), report.startAt.getDate());
  const endDay = new Date(report.endAt.getFullYear(), report.endAt.getMonth(), report.endAt.getDate());
  const days = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / 86400000) + 1);

  let mealBase = 0;
  if (days === 1) {
    const hours = (report.endAt.getTime() - report.startAt.getTime()) / 3600000;
    mealBase = hours > 8 ? settings.mealArrivalDeparture : 0;
  } else {
    mealBase = settings.mealArrivalDeparture * 2 + Math.max(0, days - 2) * settings.mealFullDay;
  }

  const mealDeductions =
    report.breakfasts * settings.breakfastDeduction +
    report.lunches * settings.lunchDeduction +
    report.dinners * settings.dinnerDeduction;

  const mealAllowance = Math.max(0, mealBase - mealDeductions);
  const mileage = report.privateKilometers * settings.mileageRate;

  const sum = (type: "PRIVATE" | "COMPANY_CARD" | "CASH") =>
    expenses.filter(x => x.paymentType === type).reduce((s, x) => s + Number(x.amount), 0);

  const privateExpenses = sum("PRIVATE");
  const companyCardExpenses = sum("COMPANY_CARD");
  const cashExpenses = sum("CASH");

  return {
    days,
    mealBase,
    mealDeductions,
    mealAllowance,
    mileage,
    privateExpenses,
    companyCardExpenses,
    cashExpenses,
    reimbursement: mealAllowance + mileage + privateExpenses + cashExpenses,
    totalCosts: mealAllowance + mileage + privateExpenses + companyCardExpenses + cashExpenses
  };
}
