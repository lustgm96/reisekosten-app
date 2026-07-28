import type { ExpenseItem, ExpenseReport, PaymentType } from "@prisma/client";

export type NumericSettings = {
  breakfastDeduction: number;
  dinnerDeduction: number;
  lunchDeduction: number;
  mealArrivalDeparture: number;
  mealFullDay: number;
  mileageRate: number;
};

type CalculationReport = Pick<
  ExpenseReport,
  | "breakfasts"
  | "dinners"
  | "endAt"
  | "lunches"
  | "privateKilometers"
  | "startAt"
>;

type CalculationExpense = {
  amount: ExpenseItem["amount"] | number;
  paymentType: PaymentType;
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

function calendarDays(startAt: Date, endAt: Date) {
  const startDay = Date.UTC(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const endDay = Date.UTC(endAt.getFullYear(), endAt.getMonth(), endAt.getDate());
  return Math.max(1, Math.round((endDay - startDay) / 86_400_000) + 1);
}

export function calculateReport(
  report: CalculationReport,
  expenses: CalculationExpense[],
  settings: NumericSettings
) {
  if (report.endAt <= report.startAt) {
    throw new Error("Das Reiseende muss nach dem Reisebeginn liegen.");
  }

  const days = calendarDays(report.startAt, report.endAt);
  const durationHours = (report.endAt.getTime() - report.startAt.getTime()) / 3_600_000;
  const mealBase =
    days === 1
      ? durationHours > 8
        ? settings.mealArrivalDeparture
        : 0
      : settings.mealArrivalDeparture * 2 +
        Math.max(0, days - 2) * settings.mealFullDay;

  const requestedMealDeductions =
    report.breakfasts * settings.breakfastDeduction +
    report.lunches * settings.lunchDeduction +
    report.dinners * settings.dinnerDeduction;
  const mealDeductions = Math.min(mealBase, requestedMealDeductions);
  const mealAllowance = roundMoney(mealBase - mealDeductions);
  const mileage = roundMoney(report.privateKilometers * settings.mileageRate);

  const sum = (type: PaymentType) =>
    roundMoney(
      expenses
        .filter(expense => expense.paymentType === type)
        .reduce((total, expense) => total + Number(expense.amount), 0)
    );

  const privateExpenses = sum("PRIVATE");
  const companyCardExpenses = sum("COMPANY_CARD");
  const cashExpenses = sum("CASH");

  return {
    days,
    mealBase: roundMoney(mealBase),
    mealDeductions: roundMoney(mealDeductions),
    mealAllowance,
    mileage,
    privateExpenses,
    companyCardExpenses,
    cashExpenses,
    reimbursement: roundMoney(mealAllowance + mileage + privateExpenses + cashExpenses),
    totalCosts: roundMoney(
      mealAllowance + mileage + privateExpenses + companyCardExpenses + cashExpenses
    )
  };
}
