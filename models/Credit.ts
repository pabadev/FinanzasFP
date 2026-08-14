import { Schema, model, models, Types } from "mongoose";

const InstallmentSchema = new Schema(
  {
    number: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    principal: { type: Number, required: true },
    interest: { type: Number, required: true },
    total: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paidDate: Date,
    transaction: { type: Types.ObjectId, ref: "Transaction" },
  },
  { _id: false },
);

const CreditSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    lender: { type: String, required: true },
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      default: "incoming",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    rate: { type: Number, default: 0 },
    term: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "biweekly", "weekly"],
      default: "monthly",
    },
    amortization: {
      type: String,
      enum: ["french", "american"],
      default: "french",
    },
    startDate: { type: Date, default: Date.now },
    account: { type: Types.ObjectId, ref: "Account" },
    installments: [InstallmentSchema],
    status: {
      type: String,
      enum: ["active", "paid", "cancelled"],
      default: "active",
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

CreditSchema.index({ entity: 1, status: 1, createdAt: -1 });

export default models.Credit || model("Credit", CreditSchema);