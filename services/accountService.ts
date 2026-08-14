import Account from "@/models/Account";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function createAccount(params: {
  entity: string;
  name: string;
  type: "bank" | "cash" | "credit_card" | "wallet";
  currency: string;
  creditLimit?: number;
  userId: string;
}) {
  await connectDB();
  await requireRole(params.userId, ["owner", "admin", "accountant"], params.entity);

  return Account.create({
    entity: params.entity,
    name: params.name,
    type: params.type,
    currency: params.currency,
    creditLimit: params.creditLimit ?? 0,
  });
}

export async function updateAccount(params: {
  accountId: string;
  name?: string;
  type?: "bank" | "cash" | "credit_card" | "wallet";
  currency?: string;
  creditLimit?: number | null;
  isActive?: boolean;
  userId: string;
}) {
  await connectDB();

  const account = await Account.findById(params.accountId);
  if (!account) throw new Error("Cuenta no encontrada");

  const entityId = account.entity.toString();
  await requireRole(params.userId, ["owner", "admin", "accountant"], entityId);

  const update: Record<string, unknown> = {};
  if (params.name !== undefined) update.name = params.name;
  if (params.type !== undefined) update.type = params.type;
  if (params.currency !== undefined) update.currency = params.currency;
  if (params.creditLimit !== undefined)
    update.creditLimit = params.creditLimit ?? 0;
  if (params.isActive !== undefined) update.isActive = params.isActive;

  await Account.findByIdAndUpdate(params.accountId, update);

  return Account.findById(params.accountId);
}

export async function ensureDefaultAccount(entityId: string) {
  await connectDB();
  const exists = await Account.findOne({
    entity: entityId,
    type: "cash",
  });

  if (exists) return exists;

  return Account.create({
    entity: entityId,
    name: "Caja",
    type: "cash",
    currency: "USD",
  });
}
