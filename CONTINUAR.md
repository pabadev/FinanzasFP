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
  - `GET /api/sales` — listar ventas.
  - `POST /api/sales/payment` — abono a venta a crédito (acredita cuenta, `income`, actualiza status).
  - `GET|POST /api/customers?entity=` — listar / crear clientes (scoping por entidad).
  - `GET|POST /api/credits?entity=` — listar / crear créditos (desembolso + amortización).
  - `POST /api/credits/payment` — pagar cuota (marca pagada + `Transaction`).
  - `GET|POST /api/exchange-rates` — tipos de cambio (upsert por par, conversión multi-moneda).
  - `GET|POST /api/categories?entity=` — categorías configurables (income|expense).
  - `POST /api/register` — con rate limit (5/min por IP) y validación de password ≥8.
- **POS real e inventario real**: `pos/page.tsx` con `PosCheckout` (consumo de `/api/products` y `/api/sales`),
  `inventory/page.tsx` con `CreateProductForm`, movimientos de stock y alertas de mínimo.
- **Clientes y cuentas por cobrar**: `models/Customer.ts`, `GET|POST /api/customers?entity=`,
  `POST /api/sales/payment` (abonos), panel en dashboard de negocio.
- **Créditos/préstamos**: `models/Credit.ts` (lender, direction, rate, term, frequency, installments),
  `services/creditService.ts` (amortización francesa/americana), `POST /api/credits` (desembolso `income`
  o `expense` según dirección) y `POST /api/credits/payment` (paga cuota → `expense`/`income` y marca pagada).
  Panel `CreditsPanel` en dashboards personal y de negocio con `CreateCreditForm` y `PayInstallmentForm`.
- **Consolidación**: `ExchangeRate` + conversión multi-moneda en transferencias, categorías configurables,
  balance consolidado personal+negocio, `CreateTransferForm` (inter-entidad), `CreateBusinessEntityForm`.
  Servicio `lib`/`services/consolidationService.ts` (cuentas de todas las entidades + conversión).
- **Dashboards reales**: `app/(dashboard)/personal/page.tsx` y
  `app/(dashboard)/business/[businessId]/page.tsx` (cuentas, KPIs del mes, actividad reciente,
  ventas del mes, stock bajo, cuentas por cobrar, créditos, transferencias, categorías). Formularios:
  `CreateAccountForm`, `CreateTransactionForm`, `CreateProductForm`, `CreateCustomerForm`,
  `CreateCreditForm`, `PayInstallmentForm`, `SalePaymentForm`, `CreateTransferForm`,
  `CreateCategoryForm`, `CreateBusinessEntityForm`, `ExchangeRateForm`.
- **Edición y reversión**: `PATCH|DELETE /api/transactions/:id` (editar/eliminar `income|expense`
  ajustando saldo y auditando), `PATCH /api/accounts/:id` (editar cuenta), `DELETE /api/sales/:id`
  (`sale_void`: repone stock, revierte pago/abonos, deja la deuda del cliente en cero, audita).
  En el dashboard de negocio hay sección **"Ventas recientes"** con botón **Anular** (confirmación).
- **UI/UX rediseñada (Fase 5, iteración 1)**: `components/layout/AppShell.tsx` — **sidebar lateral
  agrupada por contexto** (Resumen / Operación / Finanzas / Configuración) con selector de entidad
  (Personal + Negocios), nav móvil horizontal sticky y `SignOutButton` en el footer; envuelve todo
  el dashboard desde `(dashboard)/layout.tsx`. Dashboards reducidos a **Resumen** (KPIs + accesos)
  y nuevas páginas dedicadas: `/personal/cuentas|creditos|negocios|configuracion` y
  `/business/[id]/ventas|cuentas|creditos` (POS e Inventario ya existían). Paneles reutilizables en
  `components/dashboard/` (`AccountsPanel`, `MovementsPanel`, `TransfersPanel`, `CategoriesPanel`,
  `SalesPanel`, `ReceivablesPanel`, `CustomersPanel`, `EntitiesPanel`).
- **POS con precio editable**: `PosCheckout` sobrescribe el precio por ítem. Fix importante: el input
  guarda el texto crudo (`priceText`) y convierte a centavos solo al calcular, porque antes
  reformateaba a `3.00` tras el primer dígito y bloqueaba escribir el resto (ej. `35000`).
- **Cuentas por cobrar**: el panel de abonos muestra el nombre del cliente (select con nombres).
- **Seguridad aplicada**: headers (CSP, X-Frame-Options…), scoping IDOR, rol real, sin enumeración
  de usuarios, rate limiting en login/register (en memoria), `npm audit` = 0 vulnerabilidades.

## 6. Pendiente / limitaciones conocidas

- **UI/UX — PRIORITARIO (solicitud explícita del usuario)**: los dashboards están **saturados**
  (todo se muestra al mismo tiempo: cuentas, KPIs, actividad, ventas, stock bajo, cuentas por cobrar,
  créditos, transferencias, categorías + todos los formularios de alta). Se quiere una **UI más
  limpia y moderna**: menús de opciones bien organizados y **agrupados por contexto** (no
  necesariamente menús horizontales; se puede usar navegación lateral/sidebar, tabs, tarjetas y
  sub-secciones por área), para que la app sea más **intuitiva, fluida y visualmente agradable**.
  No se pide cambiar lógica de datos: reorganizar y jerarquizar la presentación.
- **Rate limiter en memoria** (`lib/rateLimit.ts`): en Vercel (serverless) cada instancia tiene su
  propio store → migrar a Redis/@upstash antes de producción real.
- **2FA**: campos `twoFactorSecret`/`twoFactorEnabled` en `User` sin implementar; si se activa,
  cifrar el secreto (AES-256-GCM) — hoy iría en texto plano.
- CSP con `'unsafe-inline'` (necesario para Next; endurecer con nonces si se quiere).
- Falta ajuste manual de saldo auditado desde UI (`manual_balance_adjustment`).

## 7. PASOS A SEGUIR (en orden)

### Fases 2, 3 y 4 — ✅ COMPLETADAS
Ventas/inventario (Customer, cuentas por cobrar, POS, inventario), créditos/préstamos (Credit,
amortización, desembolso, pago de cuota) y consolidación (transferencias, ExchangeRate, categorías,
balance consolidado) implementados y desplegados.

### Fase 5 — Rediseño de UI/UX (EN CURSO — iteración 1 desplegada)
Reorganizar la presentación sin tocar la lógica de datos. Objetivo: vistas limpias, menús de
opciones agrupados por contexto, app intuitiva y visualmente agradable.

✅ **Iteración 1 (desplegada)**: AppShell con sidebar agrupada + selector de entidad + nav móvil;
dashboards convertidos en **Resumen**; páginas dedicadas por área (personal: cuentas, creditos,
negocios, configuracion; negocio: ventas, cuentas, creditos); paneles reutilizables.

Pendiente / refinamiento UI (próxima sesión):
1. **Paginado/búsqueda en listas largas** (movimientos, ventas, productos, créditos) — hoy `limit(10/20)`.
2. **Modales en vez de formularios inline** en los paneles para reducir aún más la saturación.
3. **Estados vacíos y de carga más amigables** (mensajes orientados + acciones).
4. **Tema/consistencia**: íconos en el sidebar, tarjetas con jerarquía visual, mejorar responsive
   (tablas con scroll horizontal en móvil).
5. **Detalle de negocio**: alerta de stock bajo como componente reutilizable; página de **Reportes**
   (ventas por mes, gastos por categoría) si el usuario la pide.

### Fase 6 — Cierre de seguridad
1. **Rate limiter con Redis/Upstash** (reemplazar `lib/rateLimit.ts`; `@upstash/ratelimit` ya está
   en `package.json`).
2. **2FA TOTP** con `otplib` (ya instalado) + secreto cifrado AES-256-GCM.
3. Auditoría completa: `manual_balance_adjustment` desde UI, reversión/anulación de operaciones.
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