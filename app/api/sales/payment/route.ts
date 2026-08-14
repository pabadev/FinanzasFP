import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { SalePaymentInputSchema } from "@/lib/zodSchemas";
import { registerSalePayment } from "@/services/saleService";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SalePaymentInputSchema.safeParse(body);
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
    const sale = await registerSalePayment({
      ...parsed.data,
      userId: session.user.id,
    });
    return NextResponse.json(sale, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}