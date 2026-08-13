import { Schema, model, models, Types } from "mongoose";

const EntitySchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["personal", "business"], required: true },
    ownerUser: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    baseCurrency: { type: String, default: "USD" },
  },
  { timestamps: true },
);

EntitySchema.index({ ownerUser: 1, type: 1 });

export default models.Entity || model("Entity", EntitySchema);
