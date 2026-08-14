import { Schema, model, models, Types } from "mongoose";

const CategorySchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
  },
  { timestamps: true },
);

CategorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

export default models.Category || model("Category", CategorySchema);