import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Sale from "@/models/Sale";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { createSale } from "@/services/saleService";
import { SaleInputSchema } from "@/lib/zodSchemas";

const QuerySchema = z.object({
  entity: z.string().length(24),
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
  const sales = await Sale.find({ entity: parsed.data.entity })
    .sort({ createdAt: -1 })
    .limit(parsed.data.limit)
    .lean();

  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SaleInputSchema.safeParse(body);
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
