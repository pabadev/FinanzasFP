# SaaS Finanzas Personal/Negocio — Arquitectura Next.js + MongoDB

## 1. Estructura de Proyecto

```
/app
  /(auth)/login/page.tsx
  /(auth)/register/page.tsx
  /(dashboard)/personal/page.tsx
  /(dashboard)/business/[businessId]/page.tsx
  /(dashboard)/business/[businessId]/pos/page.tsx
  /(dashboard)/business/[businessId]/inventory/page.tsx
  /api/auth/[...nextauth]/route.ts
  /api/transfers/route.ts
  /api/sales/route.ts
  /api/products/route.ts
  layout.tsx
  middleware.ts
/models
  User.ts
  Entity.ts        // perfil personal o negocio
  Account.ts
  Transaction.ts
  Product.ts
  Sale.ts
  AuditLog.ts
/lib
  db.ts            // conexión mongoose (singleton)
  auth.ts          // config NextAuth
  zodSchemas.ts
  rbac.ts
/services
  transferService.ts
  saleService.ts
  auditService.ts
/components
  /ui
  /forms
  /dashboard
```

**Por qué así:** separa capa de datos (`models`), lógica de negocio reusable (`services`) del transporte HTTP (`app/api`), permitiendo llamar los services tanto desde Route Handlers como desde Server Actions sin duplicar lógica.

---

## 2. Modelos de Mongoose

### `lib/db.ts` — Conexión singleton (obligatorio en Next.js por hot-reload)

```ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Falta MONGODB_URI");

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
  }
  cached.conn = await cached.promise;
  (global as any).mongoose = cached;
  return cached.conn;
}
```

### `models/User.ts`

```ts
import { Schema, model, models, Types } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, select: false }, // null si login OAuth
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  entities: [{
    entity: { type: Types.ObjectId, ref: "Entity" },
    role: { type: String, enum: ["owner", "admin", "cashier", "accountant"], required: true }
  }],
}, { timestamps: true });

export default models.User || model("User", UserSchema);
```

### `models/Entity.ts` — Perfil Personal o Negocio (multi-tenant)

```ts
import { Schema, model, models, Types } from "mongoose";

const EntitySchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["personal", "business"], required: true },
  ownerUser: { type: Types.ObjectId, ref: "User", required: true, index: true },
  baseCurrency: { type: String, default: "USD" },
}, { timestamps: true });

EntitySchema.index({ ownerUser: 1, type: 1 });

export default models.Entity || model("Entity", EntitySchema);
```

### `models/Account.ts`

```ts
import { Schema, model, models, Types } from "mongoose";

const AccountSchema = new Schema({
  entity: { type: Types.ObjectId, ref: "Entity", required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["bank", "cash", "credit_card", "wallet"], required: true },
  currency: { type: String, required: true, default: "USD" },
  balance: { type: Number, required: true, default: 0 }, // en centavos (int) para evitar floats
  creditLimit: { type: Number, default: 0 }, // solo credit_card
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

AccountSchema.index({ entity: 1, isActive: 1 });

export default models.Account || model("Account", AccountSchema);
```

> **Nota crítica:** guarda montos en enteros (centavos) para evitar errores de punto flotante. Nunca uses `Number` en dólares con decimales.

### `models/Transaction.ts` — Movimientos, transferencias, inyecciones de capital

```ts
import { Schema, model, models, Types } from "mongoose";

const TransactionSchema = new Schema({
  entity: { type: Types.ObjectId, ref: "Entity", required: true, index: true },
  account: { type: Types.ObjectId, ref: "Account", required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: [
      "income", "expense", "transfer_in", "transfer_out",
      "capital_injection",     // personal -> negocio
      "partner_withdrawal",    // negocio -> personal (sueldo/retiro socio)
      "interentity_loan",      // préstamo entre entidades
      "sale_payment"
    ],
  },
  amount: { type: Number, required: true }, // centavos, siempre positivo
  currency: { type: String, required: true },
  relatedTransaction: { type: Types.ObjectId, ref: "Transaction" }, // par de la transferencia
  counterpartEntity: { type: Types.ObjectId, ref: "Entity" }, // para movimientos inter-entidad
  description: { type: String },
  category: { type: String },
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

TransactionSchema.index({ entity: 1, createdAt: -1 });
TransactionSchema.index({ account: 1, createdAt: -1 });

export default models.Transaction || model("Transaction", TransactionSchema);
```

**Por qué `relatedTransaction`:** cada transferencia genera 2 documentos (salida/entrada) enlazados; así auditas y reviertes sin ambigüedad, en vez de un solo doc con "cuenta destino" que complica reportes por cuenta.

### `models/Product.ts`

```ts
import { Schema, model, models, Types } from "mongoose";

const ProductSchema = new Schema({
  entity: { type: Types.ObjectId, ref: "Entity", required: true, index: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  type: { type: String, enum: ["physical", "service"], required: true },
  price: { type: Number, required: true }, // centavos
  cost: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }, // ignorado si type=service
  minStock: { type: Number, default: 0 },
  stockMovements: [{
    date: { type: Date, default: Date.now },
    change: Number, // + entrada, - salida
    reason: { type: String, enum: ["sale", "restock", "adjustment"] },
    ref: { type: Types.ObjectId }, // id de Sale u otra referencia
  }],
}, { timestamps: true });

ProductSchema.index({ entity: 1, sku: 1 }, { unique: true });

export default models.Product || model("Product", ProductSchema);
```

### `models/Sale.ts`

```ts
import { Schema, model, models, Types } from "mongoose";

const SaleItemSchema = new Schema({
  product: { type: Types.ObjectId, ref: "Product", required: true },
  name: String, // snapshot del nombre al momento de venta
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  isService: { type: Boolean, default: false },
}, { _id: false });

const SaleSchema = new Schema({
  entity: { type: Types.ObjectId, ref: "Entity", required: true, index: true },
  items: [SaleItemSchema],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "transfer", "card", "credit"], required: true },
  account: { type: Types.ObjectId, ref: "Account" }, // null si es crédito a cliente
  customer: { type: Types.ObjectId, ref: "Customer" },
  status: { type: String, enum: ["paid", "pending", "partial"], default: "paid" },
  soldBy: { type: Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

SaleSchema.index({ entity: 1, createdAt: -1 });

export default models.Sale || model("Sale", SaleSchema);
```

### `models/AuditLog.ts`

```ts
import { Schema, model, models, Types } from "mongoose";

const AuditLogSchema = new Schema({
  entity: { type: Types.ObjectId, ref: "Entity", index: true },
  user: { type: Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    required: true,
    enum: ["delete", "manual_balance_adjustment", "transfer", "role_change", "sale_void"],
  },
  targetCollection: { type: String, required: true },
  targetId: { type: Types.ObjectId, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  ip: String,
}, { timestamps: true });

AuditLogSchema.index({ entity: 1, createdAt: -1 });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
```

**Regla:** AuditLog nunca se actualiza ni borra (colección append-only). Refuerza esto con permisos a nivel de rol de base de datos en MongoDB Atlas si es posible.

---

## 3. Transacciones Atómicas (ACID)

### `services/transferService.ts` — Transferencia entre cuentas propias o inter-entidad

```ts
import mongoose from "mongoose";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";

interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number; // centavos
  currency: string;
  type: "transfer_out" | "capital_injection" | "partner_withdrawal" | "interentity_loan";
  userId: string;
  description?: string;
}

export async function executeTransfer(input: TransferInput) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      const fromAccount = await Account.findById(input.fromAccountId).session(session);
      const toAccount = await Account.findById(input.toAccountId).session(session);

      if (!fromAccount || !toAccount) throw new Error("Cuenta no encontrada");
      if (fromAccount.balance < input.amount) throw new Error("Fondos insuficientes");

      // Descuenta origen
      fromAccount.balance -= input.amount;
      await fromAccount.save({ session });

      // Suma destino
      toAccount.balance += input.amount;
      await toAccount.save({ session });

      // Documento de salida
      const [outTx] = await Transaction.create([{
        entity: fromAccount.entity,
        account: fromAccount._id,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        counterpartEntity: toAccount.entity,
        description: input.description,
        createdBy: input.userId,
      }], { session });

      // Documento de entrada (enlazado)
      const inType = input.type === "capital_injection" ? "transfer_in" : "transfer_in";
      const [inTx] = await Transaction.create([{
        entity: toAccount.entity,
        account: toAccount._id,
        type: inType,
        amount: input.amount,
        currency: input.currency,
        counterpartEntity: fromAccount.entity,
        relatedTransaction: outTx._id,
        description: input.description,
        createdBy: input.userId,
      }], { session });

      outTx.relatedTransaction = inTx._id;
      await outTx.save({ session });

      // Auditoría si es movimiento sensible inter-entidad
      if (["capital_injection", "partner_withdrawal", "interentity_loan"].includes(input.type)) {
        await AuditLog.create([{
          entity: fromAccount.entity,
          user: input.userId,
          action: "transfer",
          targetCollection: "Transaction",
          targetId: outTx._id,
          after: { type: input.type, amount: input.amount },
        }], { session });
      }

      result = { outTx, inTx };
    });
    return result;
  } finally {
    session.endSession();
  }
}
```

### `services/saleService.ts` — Venta con descuento de inventario atómico

```ts
import mongoose from "mongoose";
import Product from "@/models/Product";
import Sale from "@/models/Sale";
import Account from "@/models/Account";
import { connectDB } from "@/lib/db";

interface SaleItemInput {
  productId: string;
  quantity: number;
}

export async function createSale(params: {
  entityId: string;
  items: SaleItemInput[];
  paymentMethod: "cash" | "transfer" | "card" | "credit";
  accountId?: string;
  customerId?: string;
  userId: string;
}) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    let sale;
    await session.withTransaction(async () => {
      const saleItems = [];
      let total = 0;

      for (const item of params.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new Error(`Producto ${item.productId} no existe`);

        if (product.type === "physical") {
          if (product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${product.name}`);
          }
          product.stock -= item.quantity;
          product.stockMovements.push({
            change: -item.quantity,
            reason: "sale",
          });
          await product.save({ session });
        }

        saleItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          isService: product.type === "service",
        });
        total += product.price * item.quantity;
      }

      // Si no es crédito, afecta el saldo de la cuenta receptora
      if (params.paymentMethod !== "credit") {
        if (!params.accountId) throw new Error("Cuenta requerida para pago no-crédito");
        const account = await Account.findById(params.accountId).session(session);
        if (!account) throw new Error("Cuenta no encontrada");
        account.balance += total;
        await account.save({ session });
      }

      const [createdSale] = await Sale.create([{
        entity: params.entityId,
        items: saleItems,
        total,
        paymentMethod: params.paymentMethod,
        account: params.paymentMethod !== "credit" ? params.accountId : undefined,
        customer: params.customerId,
        status: params.paymentMethod === "credit" ? "pending" : "paid",
        soldBy: params.userId,
      }], { session });

      sale = createdSale;
    });
    return sale;
  } finally {
    session.endSession();
  }
}
```

**Por qué `withTransaction`:** maneja automáticamente reintentos ante errores transitorios de MongoDB (`TransientTransactionError`), cosa que `startTransaction`/`commitTransaction` manual no hace por defecto.

### Route Handler que expone el servicio: `app/api/transfers/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeTransfer } from "@/services/transferService";
import { requireRole } from "@/lib/rbac";

const TransferSchema = z.object({
  fromAccountId: z.string().length(24),
  toAccountId: z.string().length(24),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  type: z.enum(["transfer_out", "capital_injection", "partner_withdrawal", "interentity_loan"]),
  description: z.string().max(280).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = TransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await requireRole(session.user.id, ["owner", "admin", "accountant"]);
    const result = await executeTransfer({ ...parsed.data, userId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

---

## 4. Middleware de Seguridad y RBAC

### `lib/rbac.ts`

```ts
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function requireRole(userId: string, allowed: string[], entityId?: string) {
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("Usuario no encontrado");

  const membership = entityId
    ? user.entities.find((e: any) => e.entity.toString() === entityId)
    : user.entities[0];

  if (!membership || !allowed.includes(membership.role)) {
    throw new Error("Permiso denegado");
  }
  return membership.role;
}
```

### `middleware.ts` — protección de rutas a nivel de edge

```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Solo owner/admin acceden a configuración de negocio
    if (path.startsWith("/business") && path.includes("/settings")) {
      if (!["owner", "admin"].includes(role as string)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/business/:path*", "/api/((?!auth).)*"],
};
```

### `lib/zodSchemas.ts` — sanitización compartida frontend/backend

```ts
import { z } from "zod";

export const SaleInputSchema = z.object({
  entityId: z.string().length(24),
  items: z.array(z.object({
    productId: z.string().length(24),
    quantity: z.number().int().positive().max(10000),
  })).min(1),
  paymentMethod: z.enum(["cash", "transfer", "card", "credit"]),
  accountId: z.string().length(24).optional(),
  customerId: z.string().length(24).optional(),
});
```

**Uso:** el mismo schema Zod valida el formulario en un Client Component (`react-hook-form` + `zodResolver`) y en el Route Handler — una sola fuente de verdad, cero duplicación.

---

## Puntos clave a implementar después

| Área | Acción concreta |
|---|---|
| 2FA TOTP | Librería `otplib`, guardar `twoFactorSecret` cifrado con `crypto` (AES-256-GCM), no en texto plano |
| CSRF | Next.js Route Handlers ya validan origen vía `next-auth`; para forms fuera de Server Actions, usar `csrf` header token |
| Multi-moneda | Colección `ExchangeRate` con `base/quote/rate/date`, actualizada por cron (API externa tipo exchangerate.host) |
| Rate limiting | `@upstash/ratelimit` + Redis en el middleware de `/api` |
| Índices compuestos | Revisa que cada query de dashboard use un índice cubierto (`entity + createdAt` ya cubre listados) |

¿Quieres que continúe con el modelo `Customer` (cuentas por cobrar) o con el flujo de NextAuth + 2FA completo?
