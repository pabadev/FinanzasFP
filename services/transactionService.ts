import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import { connectDB } from "@/lib/db";
import { requireEntityMembership, requireRole } from "@/lib/rbac";

export async function createTransaction(params: {
  entityId: string;
  accountId: string;
  type: "income" | "expense";
  amount: number;
  category?: string;
  description?: string;
  date?: Date;
  userId: string;
}) {
  await connectDB();
  await requireEntityMembership(params.userId, params.entityId);

  const account = await Account.findOne({
    _id: params.accountId,
    entity: params.entityId,
    isActive: true,
  });

  if (!account) throw new Error("Cuenta no encontrada");

  if (params.amount <= 0) throw new Error("El monto debe ser positivo");

  if (params.type === "expense") {
    await requireRole(
      params.userId,
      ["owner", "admin", "accountant"],
      params.entityId,
    );

    const updated = await Account.findOneAndUpdate(
      { _id: params.accountId, isActive: true, balance: { $gte: params.amount } },
      { $inc: { balance: -params.amount } },
      { new: true },
    );

    if (!updated) throw new Error("Fondos insuficientes");
  } else {
    await Account.findOneAndUpdate(
      { _id: params.accountId, isActive: true },
      { $inc: { balance: params.amount } },
    );
  }

  const [tx] = await Transaction.create([
    {
      entity: params.entityId,
      account: params.accountId,
      type: params.type,
      amount: params.amount,
      currency: account.currency,
      category: params.category,
      description: params.description,
      date: params.date,
      createdBy: params.userId,
    },
  ]);

  return tx;
}
