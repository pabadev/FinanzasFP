# CONTINUAR.md — Guía de continuidad del proyecto

Documento para retomar el desarrollo en una **nueva sesión** sin perder contexto.
Léelo completo antes de continuar. El detalle técnico ampliado está en `README.md`.

---

## 1. Qué es el proyecto

**Finanzas FP**: SaaS multi-tenant que maneja **finanzas personales y de negocio** en una sola app:
cuentas, transferencias entre cuentas, ventas de artículos con inventario, venta de servicios,
ingresos y gastos de distintas fuentes (p. ej. crédito bancario) y pago de cuotas de créditos.

- **Producción**: https://finanzasfp.vercel.app (verificado: los últimos cambios están desplegados).
- **Repo**: https://github.com/pabadev/FinanzasFP — rama `master`, despliegue automático por push.

## 2. Stack (NO cambiar versiones sin plan)

- **Next.js 16.3** (App Router, Turbopack) + **React 19.2** + TypeScript strict.
- **Auth.js v5** (`next-auth@5.0.0-beta.32`) — credenciales + JWT. NO es next-auth v4.
- **MongoDB + Mongoose 8** (Atlas en producción).
- **Zod** (validación), **bcryptjs**, CSS plano (sin librería de UI).
- ESLint 9 flat config (`eslint.config.mjs`). Scripts: `npm run dev|build|lint`.

## 3. Decisiones clave (contexto fundamental)

- **Montos en CENTAVOS (enteros)** siempre. La UI convierte $ → centavos con `Math.round(x*100)`.
  Formateo: `lib/money.ts` → `formatMoney(cents, currency)`.
- **Next 16 eliminó `middleware.ts`** → no usar auth en proxy. La autenticación vive en:
  `app/(dashboard)/layout.tsx` (guarda de rutas) y en cada Route Handler (`auth()` de `lib/auth.ts`).
- **Multi-tenant**: toda consulta/escritura valida pertenencia. Helpers en `lib/rbac.ts`:
  - `getUserEntityIds(userId)`
  - `requireEntityMembership(userId, entityId)`
  - `requireRole(userId, roles, entityId)` — `entityId` es OBLIGATORIO (no hay fallback `entities[0]`).
- **Dinero con updates atómicos** (`findOneAndUpdate` con condiciones de saldo/stock), NO
  `withTransaction` (falla en MongoDB standalone). Ojo: sin transacciones ACID, una caída entre
  balance y ledger puede desincronizar; si algún día se usa clúster de réplicas se pueden reintroducir.
- **Ledger**: las transferencias crean 2 documentos enlazados por `relatedTransaction`.
  Las ventas crean una `Transaction` tipo `sale_payment`; los ingresos/gastos su propia `Transaction`.
- **Auth.js v5**: `lib/auth.ts` exporta `{ handlers, auth, signIn, signOut }`. Rol real desde BD.
  `AUTH_SECRET` obligatoria (falla si falta o es `change-me`).

## 4. Variables de entorno

`.env.local` (gitignored, no se sube). En Vercel → Production:
- `MONGODB_URI` (Atlas, Network Access a `0.0.0.0/0`)
- `AUTH_SECRET` (generar con `npx auth secret`)
- `AUTH_URL` = `https://finanzasfp.vercel.app` (opcional en v5)
- `NEXTAUTH_URL` = ídem (fallback legacy)

## 5. Estado actual — LO QUE YA FUNCIONA

- Registro → crea **usuario + entidad personal + cuenta "Efectivo"**. Usuarios legacy sin entidad ven
  onboarding (`components/dashboard/PersonalOnboarding.tsx`, botón crea entidad vía API).
- **APIs** (todas exigen sesión y validan pertenencia):
  - `GET|POST /api/entities` — listar / crear entidad (personal|business) + cuenta "Caja".
  - `GET|POST /api/accounts?entity=` — listar / crear cuentas (bank|cash|credit_card|wallet).
  - `GET|POST /api/transactions?entity=&account=&limit=` — ledger / crear `income|expense`
    (balance atómico; expense exige fondos; rol owner/admin/accountant para gastos).
  - `POST /api/transfers` — transferencias entre cuentas (misma moneda, débito atómico,
    tipos `transfer_out|capital_injection|partner_withdrawal|interentity_loan`).
  - `GET|POST /api/products?entity=` — productos físicos/servicio (stock atómico al vender).
  - `POST /api/sales` — ventas (descuento de inventario, métodos cash|transfer|card|credit,
    ledger `sale_payment`).
  - `POST /api/register` — con rate limit (5/min por IP) y validación de password ≥8.
- **Dashboards reales**: `app/(dashboard)/personal/page.tsx` y
  `app/(dashboard)/business/[businessId]/page.tsx` (cuentas, KPIs del mes, actividad reciente,
  ventas del mes, stock bajo). Formularios: `CreateAccountForm`, `CreateTransactionForm`.
- **Seguridad aplicada**: headers (CSP, X-Frame-Options…), scoping IDOR, rol real, sin enumeración
  de usuarios, rate limiting en login/register (en memoria), `npm audit` = 0 vulnerabilidades.

## 6. Pendiente / limitaciones conocidas

- **`README.md` y `CONTINUAR.md` aún NO commiteados** (git status: `??`).
- **POS e inventario siguen con datos MOCK** (`pos/page.tsx`, `inventory/page.tsx`).
- **No existe el modelo `Customer`** pero `Sale.customer` lo referencia (`ref: "Customer"`):
  al usar ventas a crédito sin ese modelo no se puede poblar. La Fase 2 lo resuelve.
- **Sin UI** para: transferencias, productos, crear entidad de negocio (solo API), ventas.
- **`Credit`/`Loan` no existe** — no hay créditos ni cuotas.
- **Rate limiter en memoria** (`lib/rateLimit.ts`): en Vercel (serverless) cada instancia tiene su
  propio store → migrar a Redis/@upstash antes de producción real.
- **2FA**: campos `twoFactorSecret`/`twoFactorEnabled` en `User` sin implementar; si se activa,
  cifrar el secreto (AES-256-GCM) — hoy iría en texto plano.
- **Multi-moneda sin conversión**: transferencias entre cuentas de distinta moneda están
  BLOQUEADAS por diseño (falta `ExchangeRate`).
- CSP con `'unsafe-inline'` (necesario para Next; endurecer con nonces si se quiere).

## 7. PASOS A SEGUIR (en orden)

### Paso 0 — Dejar el repo al día
```bash
git add README.md CONTINUAR.md
git commit -m "docs: readme y guía de continuidad"
git push
```

### Fase 2 — Ventas e inventario reales
1. Crear **`models/Customer.ts`** (entity, name, contact, phone, email, debt/balance) + API
   `GET|POST /api/customers?entity=` con scoping.
2. **Cuentas por cobrar**: sobre `Sale` con `status: pending|partial`, endpoint para registrar
   abonos (payment) que acredite la cuenta, actualice `status` y cree `Transaction` `income`.
3. **POS real**: `pos/page.tsx` consumiendo `GET /api/products?entity=` y `POST /api/sales`.
4. **Inventario real**: `inventory/page.tsx` con `GET /api/products` y alta de producto
   (`CreateProductForm`), stockMovements y alerta de mínimo.

### Fase 3 — Créditos y préstamos
1. **`models/Credit.ts`**: entity, lender, amount, currency, rate, term, frequency, cuotas.
2. **Servicio de amortización** (francés/americano) en `services/creditService.ts`.
3. **Desembolso** = `income` en la cuenta + registro del crédito.
4. **Pago de cuota** = `expense` con categoría + marcar cuota pagada + crear `Transaction`.

### Fase 4 — Consolidación
1. **UI de transferencias** (`CreateTransferForm`) → `POST /api/transfers`, incl. inter-entidad
   (capital_injection, partner_withdrawal, interentity_loan).
2. **UI de entidades de negocio** (formulario en dashboard).
3. **`ExchangeRate`** + permitir transferencias multi-moneda con conversión.
4. Categorías configurables y balance consolidado personal+negocio.

### Fase 5 — Cierre de seguridad
1. **Rate limiter con Redis/Upstash** (reemplazar `lib/rateLimit.ts`; `@upstash/ratelimit` ya está
   en `package.json`).
2. **2FA TOTP** con `otplib` (ya instalado) + secreto cifrado AES-256-GCM.
3. Auditoría completa: `sale_void`, `manual_balance_adjustment`, reversión/anulación de operaciones.
4. Endurecer CSP (nonces) y revisar RBAC por rol en servicios (`cashier` vs `accountant`).

## 8. Cómo probar (recordatorio)

- Local: requiere **MongoDB corriendo** (`mongod` en 27017) + `.env.local`. Si no hay Mongo local,
  prueba contra producción o arranca Atlas localmente.
- Comandos: `npm run dev` · `npm run build` · `npm run lint` (ambos deben pasar antes de push).
- APIs sin sesión devuelven 401; montos en centavos; usa `zodSchemas` para validar.
- Después de cada push, Vercel redespliega automáticamente desde `master`.

## 9. Cosas a no olvidar al retomar

- Leer `README.md` (arquitectura, modelos, endpoints) y este `CONTINUAR.md`.
- No usar `getServerSession` ni `authOptions` (API v4): usar `auth()` y `{ handlers }` de `lib/auth.ts`.
- No añadir middleware de auth en Next 16.
- Respetar el patrón: Route Handler (validación zod + `auth()`) → Service (lógica + scoping) → modelos.
- Mantener montos en centavos y validar siempre pertenencia multi-tenant.