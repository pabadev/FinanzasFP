import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";

export async function createAuditEntry(params: {
  entity?: string;
  userId: string;
  action: string;
  targetCollection: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  await connectDB();

  return AuditLog.create({
    entity: params.entity,
    user: params.userId,
    action: params.action,
    targetCollection: params.targetCollection,
    targetId: params.targetId,
    before: params.before,
    after: params.after,
    ip: params.ip,
  });
}
