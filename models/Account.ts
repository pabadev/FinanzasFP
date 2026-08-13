import { Schema, model, models, Types } from "mongoose";

const AccountSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["bank", "cash", "credit_card", "wallet"],
      required: true,
    },
    currency: { type: String, required: true, default: "USD" },
    balance: { type: Number, required: true, default: 0 },
    creditLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

AccountSchema.index({ entity: 1, isActive: 1 });

export default models.Account || model("Account", AccountSchema);
