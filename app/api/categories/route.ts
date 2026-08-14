import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Category from "@/models/Category";
import { connectDB } from "@/lib/db";
import { CategoryInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";

const QuerySchema = z.object({
  entity: z.string().length(24),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Se requiere el parámetro entity" },
      { status: 400 },
    );
  }

  await requireEntityMembership(session.user.id, parsed.data.entity);

  await connectDB();
  const categories = await Category.find({
    entity: parsed.data.entity,
  }).sort({ type: 1, name: 1 });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CategoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await requireEntityMembership(session.user.id, parsed.data.entity);

    await connectDB();
    const category = await Category.create({
      entity: parsed.data.entity,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}