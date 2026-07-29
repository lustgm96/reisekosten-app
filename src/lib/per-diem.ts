export type PerDiemRate = {
  code: string;
  countryCode: "DE" | "AT" | "CH";
  label: string;
  fullDay: number;
  overnight: number;
  partialDay: number;
};

export const DEFAULT_PER_DIEM_RATES: PerDiemRate[] = [
  { code: "DE", countryCode: "DE", label: "Deutschland", fullDay: 28, partialDay: 14, overnight: 20 },
  { code: "AT", countryCode: "AT", label: "Österreich", fullDay: 50, partialDay: 33, overnight: 117 },
  { code: "CH", countryCode: "CH", label: "Schweiz (übrige Orte)", fullDay: 70, partialDay: 47, overnight: 195 },
  { code: "CH_BERN", countryCode: "CH", label: "Schweiz – Bern", fullDay: 82, partialDay: 55, overnight: 195 },
  { code: "CH_GENEVA", countryCode: "CH", label: "Schweiz – Genf", fullDay: 70, partialDay: 47, overnight: 197 }
];

export const countryLabels = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz"
} as const;

export function resolvePerDiemRate(
  countryCode: string,
  destination: string,
  rates: PerDiemRate[]
) {
  const normalizedDestination = destination.toLocaleLowerCase("de-DE");
  const regionalCode =
    countryCode === "CH" && /\bbern\b/.test(normalizedDestination)
      ? "CH_BERN"
      : countryCode === "CH" && /\b(genf|geneva|genève)\b/.test(normalizedDestination)
        ? "CH_GENEVA"
        : countryCode;

  return (
    rates.find(rate => rate.code === regionalCode) ??
    rates.find(rate => rate.code === countryCode) ??
    rates.find(rate => rate.code === "DE") ??
    DEFAULT_PER_DIEM_RATES[0]
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
    rates.find(rate => rate.code === report.perDiemCode) ?? DEFAULT_PER_DIEM_RATES[0];
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
