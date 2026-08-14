import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import User from "@/models/User";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

const RegisterSchema = z
  .object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const allowed = await rateLimit(`register:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos, inténtalo más tarde" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
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

  await connectDB();
  const existing = await User.findOne({
    email: parsed.data.email.toLowerCase(),
  });

  if (existing) {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    entities: [],
  });

  const entity = await Entity.create({
    name: parsed.data.name,
    type: "personal",
    ownerUser: user._id,
    baseCurrency: "USD",
  });

  user.entities.push({ entity: entity._id, role: "owner" });
  await user.save();

  await Account.create({
    entity: entity._id,
    name: "Efectivo",
    type: "cash",
    currency: "USD",
  });

  return NextResponse.json(
    { id: user._id, email: user.email },
    { status: 201 },
  );
}
