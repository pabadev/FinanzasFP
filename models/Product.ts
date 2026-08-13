import { Schema, model, models, Types } from "mongoose";

const ProductSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: ["physical", "service"], required: true },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    stockMovements: [
      {
        date: { type: Date, default: Date.now },
        change: Number,
        reason: { type: String, enum: ["sale", "restock", "adjustment"] },
        ref: { type: Types.ObjectId },
      },
    ],
  },
  { timestamps: true },
);

ProductSchema.index({ entity: 1, sku: 1 }, { unique: true });

export default models.Product || model("Product", ProductSchema);
