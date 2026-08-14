# Finanzas FP

SaaS multi-tenant de **finanzas personales y de negocio** en una sola plataforma, construido con **Next.js 16 (App Router) + MongoDB + Auth.js v5**.

Gestiona cuentas, transferencias entre cuentas, ventas de artículos con inventario, venta de servicios, ingresos y gastos de distintas fuentes (p. ej. un crédito bancario) y pagos de cuotas de créditos.

---

## Estado actual

Funcional de punta a punta en el flujo de dinero básico:

- ✅ Registro con creación automática de **entidad personal** + cuenta "Efectivo" por defecto.
- ✅ **Auth** con credenciales (JWT), rol real desde BD, sesión de 7 días, login con rate limiting y validación de `AUTH_SECRET`.
- ✅ **Entidades** (personal / business) con cuenta "Caja" por defecto.
- ✅ **Cuentas** (bank, cash, credit_card, wallet) por entidad.
- ✅ **Ingresos y gastos** con saldo atómico y ledger (`Transaction`).
- ✅ **Transferencias** entre cuentas (débito atómico, tipos inter-entidad, conversión multi-moneda con `ExchangeRate`).
- ✅ **Productos** (physical/service) y **ventas** con descuento atómico de inventario y métodos de pago (incl. crédito).
- ✅ **Clientes** y **cuentas por cobrar** (`Customer`, ventas `pending|partial`, abonos que acreditan la cuenta y crean `income`).
- ✅ **POS real** e **inventario real** (stock, alertas de mínimo, movimientos) con **precio editable por ítem** al vender.
- ✅ **Créditos/préstamos** (`Credit`): amortización francesa/americana, desembolso (`income`) y pago de cuota (`expense`).
- ✅ **Edición y reversión**: editar/eliminar `income|expense` (`PATCH|DELETE /api/transactions/:id` con ajuste de saldo), editar cuentas (`PATCH /api/accounts/:id`) y **anular ventas** (`DELETE /api/sales/:id` — repone stock, revierte pago/abonos, audita).
- ✅ **Consolidación**: UI de transferencias inter-entidad (`capital_injection`, `partner_withdrawal`, `interentity_loan`), `ExchangeRate` + conversión multi-moneda, categorías configurables, balance consolidado personal+negocio, alta de entidades de negocio desde el dashboard.
- ✅ **Dashboards** (personal y negocio) con datos reales + formularios de alta de cuentas y movimientos.
- ✅ **Seguridad**: scoping multi-tenant (IDOR cerrado), headers de seguridad, validación zod, sin enumeración de usuarios, `npm audit` limpio.

Pendiente (ver [Roadmap](#roadmap)): **rediseño de UI/UX** (vistas menos saturadas, menús por contexto), 2FA, rate limiter con Redis, auditoría completa, CSP con nonces.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3 (Turbopack, App Router) |
| UI | React 19.2, CSS plano (sin librería de UI) |
| Autenticación | Auth.js v5 (`next-auth@5.0.0-beta`) |
| Base de datos | MongoDB + Mongoose 8 |
| Validación | Zod |
| Hash de contraseñas | bcryptjs |
| Lenguaje | TypeScript (strict) |

---

## Estructura

```
app/
  (auth)/login, (auth)/register      # páginas públicas
  (dashboard)/layout.tsx             # guard de auth + AppShell (sidebar)
  (dashboard)/personal/              # resumen, cuentas, creditos, negocios, configuracion
  (dashboard)/business/[businessId]/ # resumen, pos, inventario, ventas, cuentas, creditos
  api/auth/[...nextauth]/            # handlers de Auth.js v5
  api/register, api/entities, api/accounts,
  api/transactions, api/transfers,
  api/products, api/sales, api/sales/payment,
  api/customers, api/credits, api/credits/payment,
  api/exchange-rates, api/categories        # Route Handlers
components/
  layout/     AppShell (sidebar + nav móvil + selector de entidad)
  dashboard/  MetricCard, SignOutButton, PersonalOnboarding, CreditsPanel,
              AccountsPanel, MovementsPanel, TransfersPanel, CategoriesPanel,
              SalesPanel, ReceivablesPanel, CustomersPanel, EntitiesPanel
  forms/      CreateAccountForm, CreateTransactionForm, CreateCustomerForm,
              CreateProductForm, CreateCreditForm, PayInstallmentForm,
              SalePaymentForm, CreateTransferForm, CreateCategoryForm,
              CreateBusinessEntityForm, ExchangeRateForm, EditAccountForm,
              EditTransactionForm, VoidSaleButton
  pos/        PosCheckout
  ui/         button
lib/
  auth.ts     # config Auth.js v5 + rol real + rate limit login
  db.ts       # conexión mongoose singleton
  rbac.ts     # getUserEntityIds, requireEntityMembership, requireRole
  zodSchemas.ts
  money.ts    # formateo de centavos → moneda
  rateLimit.ts
models/       # User, Entity, Account, Transaction, Product, Sale,
              # Customer, Credit, ExchangeRate, Category, AuditLog
services/     # accountService, transactionService, transferService,
              # saleService, customerService, creditService,
              # consolidationService, auditService
types/next-auth.d.ts
middleware.ts # ELIMINADO en Next 16 (auth en layout + handlers)
```

**Nota sobre seguridad multi-tenant**: los servicios validan que cuentas/productos/entidades pertenezcan al usuario; `requireRole` exige `entityId` (no hay fallback). No uses `entities[0]`.

---

## Modelos (montos SIEMPRE en centavos, enteros)

- **User**: name, email, passwordHash (`select:false`), `twoFactorSecret`/`twoFactorEnabled` (pendiente de uso), `entities[]` (membresías con rol `owner|admin|cashier|accountant`).
- **Entity**: name, type (`personal|business`), ownerUser, baseCurrency.
- **Account**: entity, name, type (`bank|cash|credit_card|wallet`), currency, balance, creditLimit, isActive.
- **Transaction** (ledger): entity, account, type (`income|expense|transfer_in|transfer_out|capital_injection|partner_withdrawal|interentity_loan|sale_payment`), amount, currency, `relatedTransaction` (par de transferencia), counterpartEntity, description, category, date, createdBy.
- **Product**: entity, name, sku (único por entidad), type (`physical|service`), price/cost, stock, minStock, stockMovements[].
- **Sale**: entity, items[] (snapshot, unitPrice editable en POS), total, paidAmount, paymentMethod (`cash|transfer|card|credit`), account, customer, status (`paid|pending|partial|voided`), soldBy.
- **Customer**: entity, name, contact, phone, email, debt.
- **Credit**: entity, lender, direction (`incoming|outgoing`), amount, currency, rate, term, frequency (`monthly|biweekly|weekly`), amortization (`french|american`), installments[] (number, dueDate, principal, interest, total, paid), status (`active|paid|cancelled`).
- **ExchangeRate**: from, to (único `from+to`), rate, source.
- **Category**: entity, name (único por entidad), type (`income|expense`).
- **AuditLog**: append-only, action (`delete|manual_balance_adjustment|transfer|role_change|sale_void`), before/after, ip.

Índices compuestos en `entity+date` para Transaction y `entity+sku` (unique) para Product.

---

## API

Todas exigen sesión (401 si no) y validan pertenencia a la entidad. Montos en centavos.

| Endpoint | Método | Uso |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js (login, session, csrf) |
| `/api/register` | POST | Crea usuario + entidad personal + cuenta Efectivo. Rate limit 5/min por IP |
| `/api/entities` | GET | Lista entidades del usuario (con rol) |
| `/api/entities` | POST | Crea entidad + membresía owner + cuenta Caja |
| `/api/accounts?entity=` | GET | Lista cuentas de la entidad |
| `/api/accounts` | POST | Crea cuenta (rol owner/admin/accountant) |
| `/api/transactions?entity=&account=&limit=` | GET | Ledger ordenado por fecha |
| `/api/transactions` | POST | `income`/`expense` con saldo atómico (expense exige fondos) |
| `/api/transactions/:id` | PATCH | Edita `income`/`expense` (ajusta saldo por la diferencia, audita) |
| `/api/transactions/:id` | DELETE | Elimina `income`/`expense` (revierte saldo, audita) |
| `/api/accounts/:id` | PATCH | Edita cuenta (nombre, tipo, moneda, límite, activa) |
| `/api/transfers` | POST | Transferencia entre cuentas (atómica; conversión multi-moneda vía `ExchangeRate`) |
| `/api/products?entity=` | GET | Lista productos de la entidad |
| `/api/products` | POST | Crea producto |
| `/api/sales` | POST | Crea venta (descuenta stock atómico, ledger `sale_payment`; `unitPrice` opcional por ítem) |
| `/api/sales` | GET | Lista ventas de la entidad |
| `/api/sales/payment` | POST | Abono a venta a crédito (acredita cuenta, `income`, actualiza status) |
| `/api/sales/:id` | DELETE | Anula venta (`sale_void`: repone stock, revierte pago/abonos, audita) |
| `/api/customers?entity=` | GET | Lista clientes de la entidad |
| `/api/customers` | POST | Crea cliente |
| `/api/credits?entity=` | GET | Lista créditos de la entidad |
| `/api/credits` | POST | Crea crédito (amortización + desembolso `income`/`expense`) |
| `/api/credits/payment` | POST | Paga cuota (marca pagada, crea `Transaction`) |
| `/api/exchange-rates` | GET | Lista tipos de cambio |
| `/api/exchange-rates` | POST | Crea/actualiza tipo de cambio (upsert por par) |
| `/api/categories?entity=` | GET | Lista categorías de la entidad |
| `/api/categories` | POST | Crea categoría |

---

## Variables de entorno

Copia `.env.example` a `.env.local`:

```
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=<genera con: npx auth secret>
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

- `AUTH_SECRET` es **obligatoria** (la app lanza error si falta o es `change-me`). `NEXTAUTH_SECRET` sirve como fallback.
- `AUTH_URL`/`NEXTAUTH_URL` son opcionales en Auth.js v5 (se autodetecta del origen).
- `.env.local` está en `.gitignore` y **no se sube**.

---

## Puesta en marcha

Requisitos: Node.js ≥ 20.9, MongoDB (local o Atlas).

```bash
npm install
# crear .env.local con las variables anteriores
npm run dev        # http://localhost:3000
npm run build      # build de producción (Turbopack)
npm run lint       # eslint (flat config)
```

> MongoDB standalone: las operaciones de dinero usan updates atómicos (`findOneAndUpdate`) en lugar de transacciones ACID (que requieren replica set). Para producción crítica, usa un clúster de réplicas y reintroduce `withTransaction`.

---

## Despliegue en Vercel

1. Conecta el repo de GitHub en Vercel (despliegues automáticos por push).
2. En Project → Settings → Environment Variables (Production) añade:
   - `MONGODB_URI` (Atlas, con Network Access abierto a `0.0.0.0/0`)
   - `AUTH_SECRET`
   - `AUTH_URL` = `https://<proyecto>.vercel.app`
   - `NEXTAUTH_URL` = `https://<proyecto>.vercel.app`
3. Redeploy. La URL de producción es `https://finanzasfp.vercel.app`.

---

## Roadmap

1. ✅ **Fase 2 — Ventas e inventario reales**: modelo `Customer` + cuentas por cobrar (abonos, `status: partial`), POS e inventario conectados a `/api/sales` y `/api/products`, alertas de stock mínimo.
2. ✅ **Fase 3 — Créditos/préstamos**: modelo `Credit` (prestador, monto, tasa, plazo, cuotas), servicio de amortización, desembolso (`income`) y pago de cuota (`expense`) que marca cuotas pagadas.
3. ✅ **Fase 4 — Consolidación**: UI de transferencias inter-entidad (`capital_injection`, `partner_withdrawal`, `interentity_loan`), `ExchangeRate` + conversión multi-moneda, categorías configurables, balance consolidado personal+negocio.
4. ✅ **Edición y reversión**: editar/eliminar transacciones, editar cuentas, **anular ventas** (`sale_void`), precio editable en POS, cliente en cuentas por cobrar.
5. ✅ **Fase 5 — Rediseño de UI/UX**: `AppShell` con **sidebar lateral agrupada por contexto** (Resumen / Operación / Finanzas / Configuración) + nav móvil y selector de entidad; dashboards de **Resumen** limpios (KPIs + accesos) y páginas dedicadas por área (`cuentas`, `creditos`, `negocios`, `configuracion`, `ventas`). Paneles reutilizables en `components/dashboard/`.
6. **Fase 6 — Cierre**: 2FA TOTP (secreto cifrado), rate limiter con Redis/Upstash (hoy en memoria, no sirve multi-instancia), auditoría completa y reversión/anulación de operaciones, mejorar CSP con nonces.

---

## Notas técnicas / decisiones

- **Centavos enteros**: todos los montos se guardan como enteros (centavos) para evitar errores de punto flotante. La UI convierte $ → centavos (`Math.round(x*100)`).
- **Ledger desnormalizado por cuenta**: las transferencias crean 2 documentos enlazados por `relatedTransaction` para auditar/revertir sin ambigüedad.
- **Auth en layout/handlers, no en middleware**: Next 16 eliminó `middleware.ts` (→ `proxy.ts`, sin auth en esa capa tras CVE-2025-29927). Las rutas del dashboard se protegen en `(dashboard)/layout.tsx` y cada Route Handler valida sesión.
- **Rate limiting en memoria** (`lib/rateLimit.ts`): suficiente para dev/single-instance; en Vercel (serverless) hay que migrar a Redis.