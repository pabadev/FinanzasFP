import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createSale } from "@/services/saleService";
import { SaleInputSchema } from "@/lib/zodSchemas";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SaleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const sale = await createSale({
      entityId: parsed.data.entityId,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod,
      accountId: parsed.data.accountId,
      customerId: parsed.data.customerId,
      userId: session.user.id,
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}
