export const mealTypes = ["BREAKFAST", "LUNCH", "DINNER"] as const;
export type MealType = (typeof mealTypes)[number];

export const mealLabels: Record<MealType, string> = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittagessen",
  DINNER: "Abendessen"
};

function dateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function travelDateKeys(startAt: Date, endAt: Date) {
  const current = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const end = new Date(endAt.getFullYear(), endAt.getMonth(), endAt.getDate());
  const keys: string[] = [];
  while (current <= end) {
    keys.push(dateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return keys;
}

export function parseProvidedMeals(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function validateProvidedMeals(values: string[], startAt: Date, endAt: Date) {
  const allowed = new Set(
    travelDateKeys(startAt, endAt).flatMap(day => mealTypes.map(type => `${day}:${type}`))
  );
  if (values.some(value => !allowed.has(value))) {
    throw new Error("Die Auswahl der gestellten Mahlzeiten ist ungültig.");
  }
  return [...new Set(values)];
}

export function countProvidedMeals(values: string[]) {
  return {
    breakfasts: values.filter(value => value.endsWith(":BREAKFAST")).length,
    lunches: values.filter(value => value.endsWith(":LUNCH")).length,
    dinners: values.filter(value => value.endsWith(":DINNER")).length
  };
}
