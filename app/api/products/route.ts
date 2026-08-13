import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Product from "@/models/Product";
import { connectDB } from "@/lib/db";
import { ProductInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";

const QuerySchema = z.object({
  entity: z.string().length(24).optional(),
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

  if (!parsed.success || !parsed.data.entity) {
    return NextResponse.json(
      { error: "Se requiere el parámetro entity" },
      { status: 400 },
    );
  }

  await requireEntityMembership(session.user.id, parsed.data.entity);

  await connectDB();
  const products = await Product.find({
    entity: parsed.data.entity,
  }).lean();

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await requireEntityMembership(session.user.id, parsed.data.entity);

    await connectDB();
    const product = await Product.create({
      ...parsed.data,
      stock: parsed.data.stock ?? 0,
      minStock: parsed.data.minStock ?? 0,
      cost: parsed.data.cost ?? 0,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}
