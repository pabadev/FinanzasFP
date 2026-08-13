import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function requireRole(
  userId: string,
  allowed: string[],
  entityId?: string,
) {
  await connectDB();
  const user = await User.findById(userId).lean();

  if (!user) throw new Error("Usuario no encontrado");

  const membership = entityId
    ? user.entities.find((e: any) => e.entity.toString() === entityId)
    : user.entities[0];

  if (!membership || !allowed.includes(membership.role)) {
    throw new Error("Permiso denegado");
  }

  return membership.role;
}
