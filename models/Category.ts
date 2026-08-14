import { Schema, model, models, Types } from "mongoose";

const CategorySchema = new Schema(
  {
    entity: {
      type: Types.ObjectId,
      ref: "Entity",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
  },
  { timestamps: true },
);

CategorySchema.index({ entity: 1, name: 1 }, { unique: true });

export default models.Category || model("Category", CategorySchema);