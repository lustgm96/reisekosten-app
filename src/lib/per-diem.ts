import { PER_DIEM_RATES_2026, type PerDiemRateDefinition } from "./per-diem-rates-2026.ts";

export type PerDiemRate = PerDiemRateDefinition;

export const DEFAULT_PER_DIEM_RATES: PerDiemRate[] = PER_DIEM_RATES_2026;

export const countryOptions = DEFAULT_PER_DIEM_RATES
  .filter(rate => rate.code === rate.countryCode)
  .map(rate => ({ code: rate.countryCode, label: rate.label }))
  .sort((left, right) => left.label.localeCompare(right.label, "de"));

export const countryLabels: Record<string, string> = Object.fromEntries(
  countryOptions.map(country => [country.code, country.label])
);

const supportedCountryCodes = new Set(countryOptions.map(country => country.code));

export function isSupportedCountryCode(value: string) {
  return supportedCountryCodes.has(value);
}

export function resolvePerDiemRate(
  countryCode: string,
  destination: string,
  rates: PerDiemRate[]
) {
  const regionalRate = rates.find(rate =>
    rate.countryCode === countryCode &&
    rate.code !== rate.countryCode &&
    rate.destinationPattern?.test(destination)
  );

  return (
    regionalRate ??
    rates.find(rate => rate.code === countryCode) ??
    rates.find(rate => rate.code === "OTHER") ??
    rates.find(rate => rate.code === "LU") ??
    DEFAULT_PER_DIEM_RATES.find(rate => rate.code === "DE")!
  );
}

export function storedPerDiemRate(
  report: {
    perDiemCode: string;
    perDiemFullDay: number | { toString(): string };
    perDiemOvernight: number | { toString(): string };
    perDiemPartialDay: number | { toString(): string };
  },
  rates: PerDiemRate[]
): PerDiemRate {
  const template =
    rates.find(rate => rate.code === report.perDiemCode) ??
    DEFAULT_PER_DIEM_RATES.find(rate => rate.code === "DE")!;
  return {
    ...template,
    code: report.perDiemCode,
    fullDay: Number(report.perDiemFullDay),
    overnight: Number(report.perDiemOvernight),
    partialDay: Number(report.perDiemPartialDay)
  };
}

export function perDiemSettingId(
  code: string,
  field: "fullDay" | "partialDay" | "overnight"
) {
  return `perDiem.${code}.${field}`;
}
