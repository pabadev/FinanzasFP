import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Transaction from "@/models/Transaction";
import { connectDB } from "@/lib/db";
import { TransactionInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";
import { createTransaction } from "@/services/transactionService";

const QuerySchema = z.object({
  entity: z.string().length(24),
  account: z.string().length(24).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    entity: searchParams.get("entity") ?? undefined,
    account: searchParams.get("account") ?? undefined,
    limit: searchParams.get("limit") ?? "50",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  await requireEntityMembership(session.user.id, parsed.data.entity);

  await connectDB();
  const transactions = await Transaction.find({
    entity: parsed.data.entity,
    ...(parsed.data.account ? { account: parsed.data.account } : {}),
  })
    .sort({ date: -1 })
    .limit(parsed.data.limit);

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = TransactionInputSchema.safeParse(body);
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
    const tx = await createTransaction({
      entityId: parsed.data.entity,
      accountId: parsed.data.account,
      type: parsed.data.type,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: parsed.data.date,
      userId: session.user.id,
    });
    return NextResponse.json(tx, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}
