import { Schema, model, models, Types } from "mongoose";

const TransactionSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    account: {
      type: Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "income",
        "expense",
        "transfer_in",
        "transfer_out",
        "capital_injection",
        "partner_withdrawal",
        "interentity_loan",
        "sale_payment",
      ],
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    relatedTransaction: { type: Types.ObjectId, ref: "Transaction" },
    counterpartEntity: { type: Types.ObjectId, ref: "Entity" },
    description: { type: String },
    category: { type: String },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

TransactionSchema.index({ entity: 1, createdAt: -1 });
TransactionSchema.index({ account: 1, createdAt: -1 });

export default models.Transaction || model("Transaction", TransactionSchema);
