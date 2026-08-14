import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { CreditPaymentInputSchema } from "@/lib/zodSchemas";
import { payInstallment } from "@/services/creditService";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreditPaymentInputSchema.safeParse(body);
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
    const credit = await payInstallment({
      ...parsed.data,
      userId: session.user.id,
    });
    return NextResponse.json(credit, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}