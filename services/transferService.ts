import mongoose from "mongoose";

import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";

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
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const fromAccount = await Account.findById(input.fromAccountId).session(
        session,
      );
      const toAccount = await Account.findById(input.toAccountId).session(
        session,
      );

      if (!fromAccount || !toAccount) throw new Error("Cuenta no encontrada");
      if (fromAccount.balance < input.amount)
        throw new Error("Fondos insuficientes");

      fromAccount.balance -= input.amount;
      await fromAccount.save({ session });

      toAccount.balance += input.amount;
      await toAccount.save({ session });

      const [outTx] = await Transaction.create(
        [
          {
            entity: fromAccount.entity,
            account: fromAccount._id,
            type: input.type,
            amount: input.amount,
            currency: input.currency,
            counterpartEntity: toAccount.entity,
            description: input.description,
            createdBy: input.userId,
          },
        ],
        { session },
      );

      const inType =
        input.type === "capital_injection" ? "transfer_in" : "transfer_in";
      const [inTx] = await Transaction.create(
        [
          {
            entity: toAccount.entity,
            account: toAccount._id,
            type: inType,
            amount: input.amount,
            currency: input.currency,
            counterpartEntity: fromAccount.entity,
            relatedTransaction: outTx._id,
            description: input.description,
            createdBy: input.userId,
          },
        ],
        { session },
      );

      outTx.relatedTransaction = inTx._id;
      await outTx.save({ session });

      if (
        [
          "capital_injection",
          "partner_withdrawal",
          "interentity_loan",
        ].includes(input.type)
      ) {
        await AuditLog.create(
          [
            {
              entity: fromAccount.entity,
              user: input.userId,
              action: "transfer",
              targetCollection: "Transaction",
              targetId: outTx._id,
              after: { type: input.type, amount: input.amount },
            },
          ],
          { session },
        );
      }

      result = { outTx, inTx };
    });

    return result;
  } finally {
    session.endSession();
  }
}
