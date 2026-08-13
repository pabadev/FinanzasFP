import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { executeTransfer } from "@/services/transferService";
import { requireRole } from "@/lib/rbac";

const TransferSchema = z.object({
  fromAccountId: z.string().length(24),
  toAccountId: z.string().length(24),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  type: z.enum([
    "transfer_out",
    "capital_injection",
    "partner_withdrawal",
    "interentity_loan",
  ]),
  description: z.string().max(280).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = TransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await requireRole(session.user.id, ["owner", "admin", "accountant"]);
    const result = await executeTransfer({
      ...parsed.data,
      userId: session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
