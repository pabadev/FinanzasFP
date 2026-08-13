import User from "@/models/User";
import { connectDB } from "@/lib/db";

export interface Membership {
  entityId: string;
  role: string;
}

export async function getUserEntityIds(userId: string): Promise<string[]> {
  await connectDB();
  const user = await User.findById(userId)
    .select("entities")
    ;

  if (!user) return [];

  return (user.entities ?? []).map(
    (e: { entity: { toString(): string } }) => e.entity.toString(),
  );
}

export async function getUserMemberships(
  userId: string,
): Promise<Membership[]> {
  await connectDB();
  const user = await User.findById(userId)
    .select("entities")
    ;

  if (!user) return [];

  return (user.entities ?? []).map(
    (e: { entity: { toString(): string }; role: string }) => ({
      entityId: e.entity.toString(),
      role: e.role,
    }),
  );
}

export async function requireEntityMembership(
  userId: string,
  entityId: string,
): Promise<string> {
  await connectDB();
  const user = await User.findById(userId)
    .select("entities")
    ;

  if (!user) throw new Error("Usuario no encontrado");

  const membership = (user.entities ?? []).find(
    (e: { entity: { toString(): string } }) =>
      e.entity.toString() === entityId,
  );

  if (!membership) throw new Error("Permiso denegado");

  return membership.role;
}

export async function requireRole(
  userId: string,
  allowed: string[],
  entityId: string,
): Promise<string> {
  const role = await requireEntityMembership(userId, entityId);

  if (!allowed.includes(role)) {
    throw new Error("Permiso denegado");
  }

  return role;
}

