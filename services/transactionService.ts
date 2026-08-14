import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
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

export async function updateTransaction(params: {
  txId: string;
  amount?: number;
  category?: string | null;
  description?: string | null;
  date?: Date;
  userId: string;
}) {
  await connectDB();

  const tx = await Transaction.findById(params.txId);
  if (!tx) throw new Error("Transacción no encontrada");

  const entityId = tx.entity.toString();
  const accountId = tx.account.toString();
  await requireRole(
    params.userId,
    ["owner", "admin", "accountant"],
    entityId,
  );

  if (tx.type !== "income" && tx.type !== "expense") {
    throw new Error("Solo se pueden editar ingresos y gastos manuales");
  }

  const account = await Account.findOne({
    _id: accountId,
    entity: entityId,
    isActive: true,
  });
  if (!account) throw new Error("Cuenta no encontrada");

  const oldAmount = tx.amount;
  const newAmount = params.amount ?? oldAmount;
  if (newAmount <= 0) throw new Error("El monto debe ser positivo");

  const delta = tx.type === "income" ? newAmount - oldAmount : oldAmount - newAmount;

  if (delta !== 0) {
    if (delta < 0) {
      const updated = await Account.findOneAndUpdate(
        { _id: accountId, isActive: true, balance: { $gte: -delta } },
        { $inc: { balance: delta } },
        { new: true },
      );
      if (!updated) throw new Error("Fondos insuficientes");
    } else {
      await Account.findOneAndUpdate(
        { _id: accountId, isActive: true },
        { $inc: { balance: delta } },
      );
    }
  }

  const update: {
    amount?: number;
    category?: string | null;
    description?: string | null;
    date?: Date;
  } = {
    amount: newAmount,
  };
  if (params.category !== undefined) update.category = params.category;
  if (params.description !== undefined) update.description = params.description;
  if (params.date !== undefined) update.date = params.date;

  await Transaction.findByIdAndUpdate(params.txId, update);

  await AuditLog.create({
    entity: entityId,
    user: params.userId,
    action: "edit",
    targetCollection: "Transaction",
    targetId: tx._id,
    before: { amount: oldAmount, category: tx.category, description: tx.description },
    after: { amount: newAmount, category: update.category, description: update.description },
  });

  return Transaction.findById(params.txId);
}

export async function deleteTransaction(params: {
  txId: string;
  userId: string;
}) {
  await connectDB();

  const tx = await Transaction.findById(params.txId);
  if (!tx) throw new Error("Transacción no encontrada");

  const entityId = tx.entity.toString();
  const accountId = tx.account.toString();
  await requireRole(
    params.userId,
    ["owner", "admin", "accountant"],
    entityId,
  );

  if (tx.type !== "income" && tx.type !== "expense") {
    throw new Error("Solo se pueden eliminar ingresos y gastos manuales");
  }

  if (tx.type === "income") {
    const updated = await Account.findOneAndUpdate(
      { _id: accountId, isActive: true, balance: { $gte: tx.amount } },
      { $inc: { balance: -tx.amount } },
      { new: true },
    );
    if (!updated)
      throw new Error(
        "No se puede eliminar: el saldo actual no cubre el ingreso (los fondos ya fueron usados)",
      );
  } else {
    await Account.findOneAndUpdate(
      { _id: accountId, isActive: true },
      { $inc: { balance: tx.amount } },
    );
  }

  await Transaction.findByIdAndDelete(params.txId);

  await AuditLog.create({
    entity: entityId,
    user: params.userId,
    action: "delete",
    targetCollection: "Transaction",
    targetId: tx._id,
    before: {
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
    },
  });

  return { deleted: true };
}
