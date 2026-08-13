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
