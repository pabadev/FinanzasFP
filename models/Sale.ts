import { Schema, model, models, Types } from "mongoose";

const SaleItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    name: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    isService: { type: Boolean, default: false },
  },
  { _id: false },
);

const SaleSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    items: [SaleItemSchema],
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "card", "credit"],
      required: true,
    },
    account: { type: Types.ObjectId, ref: "Account" },
    customer: { type: Types.ObjectId, ref: "Customer" },
    status: {
      type: String,
      enum: ["paid", "pending", "partial"],
      default: "paid",
    },
    soldBy: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

SaleSchema.index({ entity: 1, createdAt: -1 });

export default models.Sale || model("Sale", SaleSchema);
