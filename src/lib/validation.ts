import { z } from "zod";
import { isSupportedCountryCode } from "./per-diem.ts";
import { isValidTransportSelection } from "./transport.ts";
import { isValidCurrencyCode } from "./currency.ts";

export const reportSchema = z.object({
  title: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(3).max(500),
  destination: z.string().trim().min(2).max(120),
  countryCode: z.string().refine(isSupportedCountryCode, "Unbekanntes Reiseland").default("DE"),
  accommodationMode: z.enum(["ACTUAL", "PER_DIEM", "PROVIDED"]).default("ACTUAL"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  transportType: z.string().trim().min(2).max(1000).refine(isValidTransportSelection, "Bitte mindestens ein Verkehrsmittel auswählen"),
  privateKilometers: z.coerce.number().min(0).max(100000).default(0),
  breakfasts: z.coerce.number().int().min(0).max(100).default(0),
  lunches: z.coerce.number().int().min(0).max(100).default(0),
  dinners: z.coerce.number().int().min(0).max(100).default(0)
}).refine(v => v.endAt > v.startAt, {
  message: "Das Ende muss nach dem Beginn liegen.",
  path: ["endAt"]
});

export const expenseSchema = z.object({
  expenseDate: z.coerce.date(),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(240),
  amount: z.coerce.number().positive().max(100000),
  currency: z.string().trim().toUpperCase().refine(isValidCurrencyCode, "Ungültiger Währungscode").default("EUR"),
  exchangeRate: z.coerce.number().positive().max(1000).default(1),
  vatAmount: z.coerce.number().min(0).max(100000).default(0),
  paymentType: z.enum(["PRIVATE", "COMPANY_CARD", "CASH"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  bewirtungKunde: z.string().trim().max(200).optional().or(z.literal("")),
  bewirtungTeilnehmer: z.string().trim().max(500).optional().or(z.literal("")),
  bewirtungAnlass: z.string().trim().max(500).optional().or(z.literal(""))
}).superRefine((values, ctx) => {
  if (values.category !== "Bewirtung") return;
  if (!values.bewirtungKunde?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte den bewirteten Kunden angeben.", path: ["bewirtungKunde"] });
  }
  if (!values.bewirtungTeilnehmer?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte die teilnehmenden Personen angeben.", path: ["bewirtungTeilnehmer"] });
  }
  if (!values.bewirtungAnlass?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte den Anlass der Bewirtung angeben.", path: ["bewirtungAnlass"] });
  }
});

export const commentSchema = z.object({
  text: z.string().trim().min(2).max(1000)
});

export const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(["EMPLOYEE", "APPROVER", "ADMIN"])
});

export const passwordSchema = z.object({
  password: z.string().min(8).max(100)
});

const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

const normalizedBankField = (regex: RegExp, message: string) =>
  z.string().trim().transform(v => v.replace(/\s+/g, "").toUpperCase())
    .refine(v => v === "" || regex.test(v), message)
    .optional()
    .or(z.literal(""));

export const userProfileSchema = z.object({
  employeeNumber: z.string().trim().max(40).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  dateOfBirth: z.string().trim().max(10).optional().or(z.literal("")),
  street: z.string().trim().max(160).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  iban: normalizedBankField(ibanRegex, "Ungültige IBAN"),
  bic: normalizedBankField(bicRegex, "Ungültige BIC"),
  accountHolder: z.string().trim().max(120).optional().or(z.literal(""))
});

export const cardStatementItemSchema = z.object({
  transactionDate: z.coerce.date(),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(240),
  amount: z.coerce.number().positive().max(100000)
});

export const selfDeclarationSchema = z.object({
  payeeName: z.string().trim().min(2).max(160),
  payeeAddress: z.string().trim().min(2).max(300),
  businessContext: z.string().trim().min(3).max(500),
  proofReference: z.string().trim().max(200).optional().or(z.literal("")),
  declarantName: z.string().trim().min(2).max(120)
});
