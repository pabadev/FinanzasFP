import { Schema, model, models, Types } from "mongoose";

const CustomerSchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    contact: { type: String },
    phone: { type: String },
    email: { type: String },
    debt: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CustomerSchema.index({ entity: 1, name: 1 });

export default models.Customer || model("Customer", CustomerSchema);