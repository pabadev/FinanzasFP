import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";
import { requireRole, requireEntityMembership } from "@/lib/rbac";

interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  type:
    | "transfer_out"
    | "capital_injection"
    | "partner_withdrawal"
    | "interentity_loan";
  userId: string;
  description?: string;
}

export async function executeTransfer(input: TransferInput) {
  await connectDB();

  const fromAccount = await Account.findById(input.fromAccountId);
  const toAccount = await Account.findById(input.toAccountId);

  if (!fromAccount || !toAccount) throw new Error("Cuenta no encontrada");
  if (!fromAccount.isActive || !toAccount.isActive)
    throw new Error("Cuenta inactiva");

  const fromId = fromAccount._id.toString();
  const toId = toAccount._id.toString();
  const fromEntity = fromAccount.entity.toString();
  const toEntity = toAccount.entity.toString();

  if (fromId === toId)
    throw new Error("No puedes transferir a la misma cuenta");

  if (
    fromAccount.currency !== toAccount.currency ||
    fromAccount.currency !== input.currency
  ) {
    throw new Error("Las cuentas deben estar en la misma moneda");
  }

  await requireRole(
    input.userId,
    ["owner", "admin", "accountant"],
    fromEntity,
  );
  await requireEntityMembership(input.userId, toEntity);

  const updatedFrom = await Account.findOneAndUpdate(
    { _id: fromAccount._id, isActive: true, balance: { $gte: input.amount } },
    { $inc: { balance: -input.amount } },
    { new: true },
  );

  if (!updatedFrom) throw new Error("Fondos insuficientes");

  await Account.findOneAndUpdate(
    { _id: toAccount._id, isActive: true },
    { $inc: { balance: input.amount } },
    { new: true },
  );

  const [outTx] = await Transaction.create([
    {
      entity: fromEntity,
      account: fromId,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      counterpartEntity: toEntity,
      description: input.description,
      createdBy: input.userId,
    },
  ]);

  const [inTx] = await Transaction.create([
    {
      entity: toEntity,
      account: toId,
      type: "transfer_in",
      amount: input.amount,
      currency: input.currency,
      counterpartEntity: fromEntity,
      relatedTransaction: outTx._id,
      description: input.description,
      createdBy: input.userId,
    },
  ]);

  outTx.relatedTransaction = inTx._id;
  await outTx.save();

  if (
    ["capital_injection", "partner_withdrawal", "interentity_loan"].includes(
      input.type,
    )
  ) {
    await AuditLog.create({
      entity: fromEntity,
      user: input.userId,
      action: "transfer",
      targetCollection: "Transaction",
      targetId: outTx._id,
      after: { type: input.type, amount: input.amount },
    });
  }

  return { outTx, inTx };
}

