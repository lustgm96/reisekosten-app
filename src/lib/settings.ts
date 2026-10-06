import { db } from "./db";
import type { NumericSettings } from "./calculation";
import {
  DEFAULT_PER_DIEM_RATES,
  perDiemSettingId,
  type PerDiemRate
} from "./per-diem";

// Standardwerte, falls die Einstellungen (noch) nicht in der Datenbank stehen,
// z. B. in einer frischen Beta-Datenbank ohne Seed.
const DEFAULT_NUMERIC_SETTINGS: NumericSettings = {
  breakfastDeduction: 5.6,
  dinnerDeduction: 11.2,
  lunchDeduction: 11.2,
  mealArrivalDeparture: 14,
  mealFullDay: 28,
  mileageRate: 0.3
};

export async function getNumericSettings() {
  const rows = await db.appSetting.findMany();
  const values: Record<string, number> = {
    ...DEFAULT_NUMERIC_SETTINGS,
    ...Object.fromEntries(rows.map(row => [row.id, Number(row.value)]))
  };
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

export async function getPerDiemRates(): Promise<PerDiemRate[]> {
  const ids = DEFAULT_PER_DIEM_RATES.flatMap(rate => [
    perDiemSettingId(rate.code, "fullDay"),
    perDiemSettingId(rate.code, "partialDay"),
    perDiemSettingId(rate.code, "overnight")
  ]);
  const stored = Object.fromEntries(
    (await db.appSetting.findMany({ where: { id: { in: ids } } })).map(row => [row.id, row.value])
  );

  return DEFAULT_PER_DIEM_RATES.map(rate => {
    const fullDay = Number(stored[perDiemSettingId(rate.code, "fullDay")] ?? rate.fullDay);
    const partialDay = Number(
      stored[perDiemSettingId(rate.code, "partialDay")] ?? rate.partialDay
    );
    const overnight = Number(
      stored[perDiemSettingId(rate.code, "overnight")] ?? rate.overnight
    );
    if (
      !Number.isFinite(fullDay) ||
      !Number.isFinite(partialDay) ||
      !Number.isFinite(overnight) ||
      fullDay < 0 ||
      partialDay < 0 ||
      overnight < 0
    ) {
      throw new Error(`Ungültiger Pauschalsatz: ${rate.label}`);
    }
    return { ...rate, fullDay, partialDay, overnight };
  });
}
