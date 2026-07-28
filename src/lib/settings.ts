import { db } from "./db";
import type { NumericSettings } from "./calculation";

export async function getNumericSettings() {
  const rows = await db.appSetting.findMany();
  const values = Object.fromEntries(rows.map(row => [row.id, Number(row.value)]));
  const keys: Array<keyof NumericSettings> = [
    "breakfastDeduction",
    "dinnerDeduction",
    "lunchDeduction",
    "mealArrivalDeparture",
    "mealFullDay",
    "mileageRate"
  ];

  for (const key of keys) {
    if (!Number.isFinite(values[key]) || values[key] < 0) {
      throw new Error(`Ungültiger Einstellungswert: ${key}`);
    }
  }

  return Object.fromEntries(keys.map(key => [key, values[key]])) as NumericSettings;
}

export async function getCompanyName() {
  return (await db.appSetting.findUnique({ where: { id: "companyName" } }))?.value || "Unternehmen";
}
