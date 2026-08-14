import { Schema, model, models, Types } from "mongoose";

const AuditLogSchema = new Schema(
  {
    entity: { type: Types.ObjectId, ref: "Entity", index: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "delete",
        "edit",
        "manual_balance_adjustment",
        "transfer",
        "role_change",
        "sale_void",
      ],
    },
    targetCollection: { type: String, required: true },
    targetId: { type: Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: String,
  },
  { timestamps: true },
);

AuditLogSchema.index({ entity: 1, createdAt: -1 });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
