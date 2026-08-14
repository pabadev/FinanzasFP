import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import Customer from "@/models/Customer";
import { connectDB } from "@/lib/db";
import { CustomerInputSchema } from "@/lib/zodSchemas";
import { requireEntityMembership } from "@/lib/rbac";
import { createCustomer } from "@/services/customerService";

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
  const customers = await Customer.find({
    entity: parsed.data.entity,
  }).sort({ name: 1 });

  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CustomerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const customer = await createCustomer({
      ...parsed.data,
      email: parsed.data.email || undefined,
      userId: session.user.id,
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}