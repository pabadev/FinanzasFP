import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import ExchangeRate from "@/models/ExchangeRate";
import { connectDB } from "@/lib/db";
import { ExchangeRateInputSchema } from "@/lib/zodSchemas";

const QuerySchema = z.object({
  from: z.string().length(3).optional(),
  to: z.string().length(3).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  await connectDB();
  const rates = await ExchangeRate.find({
    ...(parsed.data.from ? { from: parsed.data.from } : {}),
    ...(parsed.data.to ? { to: parsed.data.to } : {}),
  }).sort({ from: 1, to: 1 });

  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ExchangeRateInputSchema.safeParse(body);
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

  const { from, to } = parsed.data;
  if (from === to) {
    return NextResponse.json(
      { error: "El par debe ser de monedas distintas" },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const rate = await ExchangeRate.findOneAndUpdate(
      { from: from.toUpperCase(), to: to.toUpperCase() },
      {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: parsed.data.rate,
        source: parsed.data.source,
      },
      { new: true, upsert: true },
    );
    return NextResponse.json(rate, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 400 },
    );
  }
}