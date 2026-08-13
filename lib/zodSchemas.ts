import { z } from "zod";

export const SaleInputSchema = z.object({
  entityId: z.string().length(24),
  items: z
    .array(
      z.object({
        productId: z.string().length(24),
        quantity: z.number().int().positive().max(10000),
      }),
    )
    .min(1),
  paymentMethod: z.enum(["cash", "transfer", "card", "credit"]),
  accountId: z.string().length(24).optional(),
  customerId: z.string().length(24).optional(),
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

export const TransactionInputSchema = z.object({
  entity: z.string().length(24),
  account: z.string().length(24),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  category: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  date: z.coerce.date().optional(),
});
