import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Category from "@/models/Category";
import { connectDB } from "@/lib/db";
import { CategoryInputSchema } from "@/lib/zodSchemas";

const QuerySchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    type: searchParams.get("type") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetro type inválido" },
      { status: 400 },
    );
  }

  await connectDB();
  const filter: { user: string; type?: string } = {
    user: session.user.id,
  };
  if (parsed.data.type) filter.type = parsed.data.type;

  const categories = await Category.find(filter).sort({ type: 1, name: 1 });

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
    await connectDB();
    const category = await Category.create({
      user: session.user.id,
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