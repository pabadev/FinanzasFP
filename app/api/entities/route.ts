import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import Entity from "@/models/Entity";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { EntityInputSchema } from "@/lib/zodSchemas";
import { ensureDefaultAccount } from "@/services/accountService";

interface PopulatedMembership {
  role: string;
  entity: {
    _id: { toString(): string };
    name: string;
    type: string;
    baseCurrency: string;
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).populate({
    path: "entities.entity",
    model: Entity,
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const entities = (user.entities ?? []).map(
    (membership: PopulatedMembership) => ({
      _id: membership.entity._id.toString(),
      name: membership.entity.name,
      type: membership.entity.type,
      baseCurrency: membership.entity.baseCurrency,
      role: membership.role,
    }),
  );

  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = EntityInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const entity = await Entity.create({
    name: parsed.data.name,
    type: parsed.data.type,
    ownerUser: user._id,
    baseCurrency: parsed.data.baseCurrency,
  });

  user.entities.push({ entity: entity._id, role: "owner" });
  await user.save();

  await ensureDefaultAccount(entity._id.toString());

  return NextResponse.json(entity, { status: 201 });
}
