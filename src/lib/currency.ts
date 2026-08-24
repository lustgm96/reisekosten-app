export const DEFAULT_CURRENCY = "EUR";

export const currencyOptions = [
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "US-Dollar (USD)" },
  { code: "GBP", label: "Britisches Pfund (GBP)" },
  { code: "CHF", label: "Schweizer Franken (CHF)" },
  { code: "JPY", label: "Japanischer Yen (JPY)" },
  { code: "CNY", label: "Chinesischer Yuan (CNY)" },
  { code: "AUD", label: "Australischer Dollar (AUD)" },
  { code: "CAD", label: "Kanadischer Dollar (CAD)" },
  { code: "SGD", label: "Singapur-Dollar (SGD)" },
  { code: "AED", label: "VAE-Dirham (AED)" }
] as const;

const knownCurrencyCodes = new Set(currencyOptions.map(option => option.code));

export function isKnownCurrencyCode(code: string) {
  return knownCurrencyCodes.has(code as (typeof currencyOptions)[number]["code"]);
}

export function isValidCurrencyCode(code: string) {
  return /^[A-Z]{3}$/.test(code);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrencyAmount(amount: number, currencyCode: string) {
  let formatter = formatterCache.get(currencyCode);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: currencyCode });
    } catch {
      formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
    }
    formatterCache.set(currencyCode, formatter);
  }
  return formatter.format(amount);
}

export function toEur(amount: number | { toString(): string }, exchangeRate: number | { toString(): string } = 1) {
  return Number(amount) * Number(exchangeRate);
}
