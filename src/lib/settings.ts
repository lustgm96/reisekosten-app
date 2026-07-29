import { db } from "./db";
import type { NumericSettings } from "./calculation";
import {
  DEFAULT_PER_DIEM_RATES,
  perDiemSettingId,
  type PerDiemRate
} from "./per-diem";

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

export async function getPerDiemRates(): Promise<PerDiemRate[]> {
  const ids = DEFAULT_PER_DIEM_RATES.flatMap(rate => [
    perDiemSettingId(rate.code, "fullDay"),
    perDiemSettingId(rate.code, "partialDay")
  ]);
  const stored = Object.fromEntries(
    (await db.appSetting.findMany({ where: { id: { in: ids } } })).map(row => [row.id, row.value])
  );

  return DEFAULT_PER_DIEM_RATES.map(rate => {
    const fullDay = Number(stored[perDiemSettingId(rate.code, "fullDay")] ?? rate.fullDay);
    const partialDay = Number(
      stored[perDiemSettingId(rate.code, "partialDay")] ?? rate.partialDay
    );
    if (
      !Number.isFinite(fullDay) ||
      !Number.isFinite(partialDay) ||
      fullDay < 0 ||
      partialDay < 0
    ) {
      throw new Error(`Ungültiger Pauschalsatz: ${rate.label}`);
    }
    return { ...rate, fullDay, partialDay };
  });
}
