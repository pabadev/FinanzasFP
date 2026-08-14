import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Credit from "@/models/Credit";
import { connectDB } from "@/lib/db";
import { CreditInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";
import { createCredit } from "@/services/creditService";

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
  const credits = await Credit.find({ entity: parsed.data.entity }).sort({
    createdAt: -1,
  });

  return NextResponse.json(credits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreditInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const credit = await createCredit({
      ...parsed.data,
      userId: session.user.id,
    });
    return NextResponse.json(credit, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}