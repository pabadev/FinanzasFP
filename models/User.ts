import { Schema, model, models, Types } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    entities: [
      {
        entity: { type: Types.ObjectId, ref: "Entity" },
        role: {
          type: String,
          enum: ["owner", "admin", "cashier", "accountant"],
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

export default models.User || model("User", UserSchema);
