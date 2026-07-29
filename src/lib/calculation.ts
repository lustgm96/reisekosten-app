import type { ExpenseItem, ExpenseReport, PaymentType } from "@prisma/client";
import type { PerDiemRate } from "./per-diem";

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
> & {
  accommodationMode: "ACTUAL" | "PER_DIEM" | "PROVIDED";
  perDiemOvernight: ExpenseItem["amount"] | number;
};

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
  settings: NumericSettings,
  perDiemRate?: Pick<PerDiemRate, "fullDay" | "partialDay">
) {
  if (report.endAt <= report.startAt) {
    throw new Error("Das Reiseende muss nach dem Reisebeginn liegen.");
  }

  const days = calendarDays(report.startAt, report.endAt);
  const durationHours = (report.endAt.getTime() - report.startAt.getTime()) / 3_600_000;
  const fullDayRate = perDiemRate?.fullDay ?? settings.mealFullDay;
  const partialDayRate = perDiemRate?.partialDay ?? settings.mealArrivalDeparture;
  const mealBase =
    days === 1
      ? durationHours > 8
        ? partialDayRate
        : 0
      : partialDayRate * 2 + Math.max(0, days - 2) * fullDayRate;

  const requestedMealDeductions =
    report.breakfasts * (perDiemRate ? fullDayRate * 0.2 : settings.breakfastDeduction) +
    report.lunches * (perDiemRate ? fullDayRate * 0.4 : settings.lunchDeduction) +
    report.dinners * (perDiemRate ? fullDayRate * 0.4 : settings.dinnerDeduction);
  const mealDeductions = Math.min(mealBase, requestedMealDeductions);
  const mealAllowance = roundMoney(mealBase - mealDeductions);
  const nights = Math.max(0, days - 1);
  const lodgingAllowance =
    report.accommodationMode === "PER_DIEM"
      ? roundMoney(nights * Number(report.perDiemOvernight))
      : 0;
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
    nights,
    mealBase: roundMoney(mealBase),
    mealDeductions: roundMoney(mealDeductions),
    mealAllowance,
    lodgingAllowance,
    mileage,
    privateExpenses,
    companyCardExpenses,
    cashExpenses,
    reimbursement: roundMoney(
      mealAllowance + lodgingAllowance + mileage + privateExpenses + cashExpenses
    ),
    totalCosts: roundMoney(
      mealAllowance +
        lodgingAllowance +
        mileage +
        privateExpenses +
        companyCardExpenses +
        cashExpenses
    )
  };
}
