import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { TransactionUpdateSchema } from "@/lib/zodSchemas";
import {
  updateTransaction,
  deleteTransaction,
} from "@/services/transactionService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = TransactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const tx = await updateTransaction({
      txId: id,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: parsed.data.date,
      userId: session.user.id,
    });
    return NextResponse.json(tx, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteTransaction({
      txId: id,
      userId: session.user.id,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}