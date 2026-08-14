import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Account from "@/models/Account";
import { connectDB } from "@/lib/db";
import { AccountInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";
import { createAccount } from "@/services/accountService";

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
  const accounts = await Account.find({
    entity: parsed.data.entity,
  }).sort({ createdAt: 1 });

  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = AccountInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          Object.values(parsed.error.flatten().fieldErrors)
            .flat()
            .join(", ") || "Datos inválidos",
      },
      { status: 400 },
    );
  }

  try {
    const account = await createAccount({
      ...parsed.data,
      creditLimit: parsed.data.creditLimit ?? 0,
      userId: session.user.id,
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}
