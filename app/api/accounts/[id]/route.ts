import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { AccountUpdateSchema } from "@/lib/zodSchemas";
import { updateAccount } from "@/services/accountService";

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
  const parsed = AccountUpdateSchema.safeParse(body);
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
    const account = await updateAccount({
      accountId: id,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency,
      creditLimit: parsed.data.creditLimit,
      isActive: parsed.data.isActive,
      userId: session.user.id,
    });
    return NextResponse.json(account, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}