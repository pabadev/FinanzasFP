import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import Product from "@/models/Product";
import { connectDB } from "@/lib/db";
import { ProductInputSchema } from "@/lib/zodSchemas";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await connectDB();
  const products = await Product.find({}).lean();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const product = await Product.create({
      ...parsed.data,
      stock: parsed.data.stock ?? 0,
      minStock: parsed.data.minStock ?? 0,
      cost: parsed.data.cost ?? 0,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
