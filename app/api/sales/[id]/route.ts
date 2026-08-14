import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { voidSale } from "@/services/saleService";

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
    const sale = await voidSale({ saleId: id, userId: session.user.id });
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