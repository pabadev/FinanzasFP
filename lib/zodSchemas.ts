import { z } from "zod";

export const SaleInputSchema = z.object({
  entityId: z.string().length(24),
  items: z
    .array(
      z.object({
        productId: z.string().length(24),
        quantity: z.number().int().positive().max(10000),
        unitPrice: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
  paymentMethod: z.enum(["cash", "transfer", "card", "credit"]),
  accountId: z.string().length(24).optional(),
  customerId: z.string().length(24).optional(),
});

export const TransactionUpdateSchema = z.object({
  amount: z.number().int().positive().optional(),
  category: z.string().min(1).max(80).nullable().optional(),
  description: z.string().max(280).nullable().optional(),
  date: z.coerce.date().optional(),
});

export const AccountUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  type: z.enum(["bank", "cash", "credit_card", "wallet"]).optional(),
  currency: z.string().length(3).optional(),
  creditLimit: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const ProductInputSchema = z.object({
  entity: z.string().length(24),
  name: z.string().min(2).max(160),
  sku: z.string().min(2).max(80),
  type: z.enum(["physical", "service"]),
  price: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
});

export const EntityInputSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["personal", "business"]),
  baseCurrency: z.string().length(3).default("USD"),
});

export const AccountInputSchema = z.object({
  entity: z.string().length(24),
  name: z.string().min(2).max(80),
  type: z.enum(["bank", "cash", "credit_card", "wallet"]),
  currency: z.string().length(3).default("USD"),
  creditLimit: z.number().int().nonnegative().optional(),
});

export const CustomerInputSchema = z.object({
  entity: z.string().length(24),
  name: z.string().min(2).max(120),
  contact: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.union([z.string().email().max(160), z.string().length(0)]).optional(),
});

export const SalePaymentInputSchema = z.object({
  saleId: z.string().length(24),
  accountId: z.string().length(24),
  amount: z.number().int().positive(),
});

export const CreditInputSchema = z.object({
  entity: z.string().length(24),
  lender: z.string().min(2).max(120),
  direction: z.enum(["incoming", "outgoing"]).default("incoming"),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  rate: z.number().nonnegative().default(0),
  term: z.number().int().positive().max(600),
  frequency: z.enum(["monthly", "biweekly", "weekly"]).default("monthly"),
  amortization: z.enum(["french", "american"]).default("french"),
  startDate: z.coerce.date().optional(),
  accountId: z.string().length(24),
});

export const CreditPaymentInputSchema = z.object({
  creditId: z.string().length(24),
  installmentNumber: z.number().int().positive(),
  accountId: z.string().length(24),
});

export const ExchangeRateInputSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  rate: z.number().positive(),
  source: z.string().max(80).optional(),
});

export const CategoryInputSchema = z.object({
  entity: z.string().length(24),
  name: z.string().min(2).max(80),
  type: z.enum(["income", "expense"]),
});

export const TransactionInputSchema = z.object({
  entity: z.string().length(24),
  account: z.string().length(24),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  category: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  date: z.coerce.date().optional(),
});
