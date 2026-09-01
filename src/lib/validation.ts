import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  timezone: z.string().default("Africa/Lagos"),
  baseCurrency: z.string().length(3).default("NGN"),
  dateFormat: z.string().default("DD/MM/YYYY"),
});

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_SPENDING", "SAVINGS_ALLOCATION", "SAVINGS_WITHDRAWAL", "ACCOUNT_TRANSFER", "OTHER"]),
  amount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  exchangeRate: z.number().positive().default(1),
  date: z.string().or(z.date()),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  description: z.string().max(500).optional(),
  vendor: z.string().max(200).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});
