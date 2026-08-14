import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { CreateAccountForm } from "@/components/forms/CreateAccountForm";
import { CreateTransactionForm } from "@/components/forms/CreateTransactionForm";
import { SalePaymentForm } from "@/components/forms/SalePaymentForm";
import { CreditsPanel } from "@/components/dashboard/CreditsPanel";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import Credit from "@/models/Credit";

export default async function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  await requireEntityMembership(session.user.id, businessId);
  await connectDB();

  const entity = await Entity.findById(businessId);
  if (!entity) {
    return (
      <div className="dashboard-shell">
        <p>Entidad no encontrada.</p>
      </div>
    );
  }

  const currency = entity.baseCurrency ?? "USD";
  const accounts = await Account.find({ entity: businessId, isActive: true });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthSales, lowStock, recent, pendingSalesAll, customers, credits] =
    await Promise.all([
      Sale.find({ entity: businessId, createdAt: { $gte: monthStart } }),
      Product.find({
        entity: businessId,
        type: "physical",
        $expr: { $lte: ["$stock", "$minStock"] },
      }),
      Transaction.find({ entity: businessId }).sort({ date: -1 }).limit(10),
      Sale.find({ entity: businessId, status: { $in: ["pending", "partial"] } })
        .sort({ createdAt: -1 })
        .limit(20),
      Customer.find({ entity: businessId }).sort({ name: 1 }),
      Credit.find({ entity: businessId }).sort({ createdAt: -1 }),
    ]);

  const salesTotal = monthSales.reduce(
    (sum, sale) => sum + (sale.total ?? 0),
    0,
  );
  const cashSales = monthSales.filter((s) => s.paymentMethod !== "credit");
  const pendingSales = monthSales.filter((s) => s.status !== "paid");

  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

  const pendingSalesForForm = pendingSalesAll.map((sale) => ({
    _id: sale._id.toString(),
    total: sale.total,
    paidAmount: sale.paidAmount ?? 0,
  }));

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>{entity.name}</h2>
        </div>
        <nav>
          <Link href="/personal">Personal</Link>
          <Link href={`/business/${businessId}`}>Resumen</Link>
          <Link href={`/business/${businessId}/pos`}>POS</Link>
          <Link href={`/business/${businessId}/inventory`}>Inventario</Link>
          <SignOutButton />
        </nav>
      </header>

      <div className="summary-grid">
        <MetricCard
          label="Ventas"
          value={formatMoney(salesTotal, currency)}
          detail="Este mes"
        />
        <MetricCard
          label="Ventas cobradas"
          value={cashSales.length.toString()}
          detail="Pagadas al contado"
        />
        <MetricCard
          label="Pendientes"
          value={pendingSales.length.toString()}
          detail="Ventas a crédito"
        />
        <MetricCard
          label="Stock bajo"
          value={lowStock.length.toString()}
          detail="Productos a reponer"
        />
      </div>

      <div className="grid-two">
        <section className="panel">
          <h3>Cuentas</h3>
          {accounts.length === 0 ? (
            <p className="small-text">Sin cuentas todavía.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account._id.toString()}>
                    <td>{account.name}</td>
                    <td>{account.type}</td>
                    <td>{formatMoney(account.balance ?? 0, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <CreateAccountForm entityId={businessId} />
        </section>

        <section className="panel">
          <h3>Movimientos recientes</h3>
          {recent.length === 0 ? (
            <p className="small-text">Sin movimientos todavía.</p>
          ) : (
            <ul>
              {recent.map((item) => {
                const amount =
                  item.type === "expense" || item.type === "transfer_out"
                    ? -item.amount
                    : item.amount;
                return (
                  <li key={item._id.toString()}>
                    <strong>{item.description || item.type}</strong>{" "}
                    <span>
                      {amount >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(amount), currency)}
                    </span>
                    <div className="small-text">
                      {item.category ? `${item.category} · ` : ""}
                      {new Date(item.date ?? item.createdAt).toLocaleDateString(
                        "es",
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <CreateTransactionForm
            entityId={businessId}
            accounts={accountsForForm}
          />
        </section>
      </div>

      <div className="grid-two">
        <section className="panel">
          <h3>Cuentas por cobrar</h3>
          {pendingSalesAll.length === 0 ? (
            <p className="small-text">
              Sin ventas pendientes. Las ventas a crédito aparecen aquí.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Pendiente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendingSalesAll.map((sale) => {
                  const pending =
                    sale.total - (sale.paidAmount ?? 0);
                  return (
                    <tr key={sale._id.toString()}>
                      <td>#{sale._id.toString().slice(-6)}</td>
                      <td>{formatMoney(sale.total, currency)}</td>
                      <td>{formatMoney(sale.paidAmount ?? 0, currency)}</td>
                      <td>{formatMoney(pending, currency)}</td>
                      <td>{sale.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {pendingSalesAll.length > 0 && (
            <SalePaymentForm
              pendingSales={pendingSalesForForm}
              accounts={accountsForForm}
            />
          )}
        </section>

        <section className="panel">
          <h3>Clientes</h3>
          {customers.length === 0 ? (
            <p className="small-text">Sin clientes todavía.</p>
          ) : (
            <ul>
              {customers.map((customer) => (
                <li key={customer._id.toString()}>
                  <strong>{customer.name}</strong>
                  {customer.debt ? (
                    <span className="error-text">
                      {" "}
                      · Deuda {formatMoney(customer.debt, currency)}
                    </span>
                  ) : (
                    <span className="success-text"> · Al día</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt">
        <CreditsPanel
          entityId={businessId}
          credits={credits}
          accounts={accounts}
          currency={currency}
        />
      </div>
    </div>
  );
}
