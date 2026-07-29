import { z } from "zod";

export const reportSchema = z.object({
  title: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(3).max(500),
  destination: z.string().trim().min(2).max(120),
  countryCode: z.enum(["DE", "AT", "CH"]).default("DE"),
  accommodationMode: z.enum(["ACTUAL", "PER_DIEM", "PROVIDED"]).default("ACTUAL"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  transportType: z.string().trim().min(2).max(80),
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
  vatAmount: z.coerce.number().min(0).max(100000).default(0),
  paymentType: z.enum(["PRIVATE", "COMPANY_CARD", "CASH"])
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
