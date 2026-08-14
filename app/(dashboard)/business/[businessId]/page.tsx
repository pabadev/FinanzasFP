import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import { MetricCard } from "@/components/dashboard/MetricCard";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Sale from "@/models/Sale";
import Product from "@/models/Product";

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
      <div>
        <p>Entidad no encontrada.</p>
      </div>
    );
  }

  const currency = entity.baseCurrency ?? "USD";
  const accounts = await Account.find({ entity: businessId, isActive: true });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthSales, lowStock, recent] = await Promise.all([
    Sale.find({ entity: businessId, createdAt: { $gte: monthStart } }),
    Product.find({
      entity: businessId,
      type: "physical",
      $expr: { $lte: ["$stock", "$minStock"] },
    }),
    Transaction.find({ entity: businessId }).sort({ date: -1 }).limit(5),
  ]);

  const salesTotal = monthSales.reduce(
    (sum, sale) => sum + (sale.total ?? 0),
    0,
  );
  const cashSales = monthSales.filter((s) => s.paymentMethod !== "credit");
  const pendingSales = monthSales.filter((s) => s.status !== "paid");

  return (
    <div>
      <header className="page-head">
        <h2>{entity.name}</h2>
        <div className="page-head-actions">
          <Link className="secondary-btn" href={`/business/${businessId}/pos`}>
            Punto de venta
          </Link>
          <Link
            className="secondary-btn"
            href={`/business/${businessId}/inventario`}
          >
            Inventario
          </Link>
          <Link
            className="secondary-btn"
            href={`/business/${businessId}/ventas`}
          >
            Ventas y clientes
          </Link>
        </div>
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

      <div className="grid-two mt">
        <section className="panel">
          <h3>Cuentas</h3>
          {accounts.length === 0 ? (
            <p className="small-text">Sin cuentas todavía.</p>
          ) : (
            <ul>
              {accounts.map((account) => (
                <li key={account._id.toString()}>
                  <strong>{account.name}</strong>{" "}
                  <span>
                    {formatMoney(account.balance ?? 0, currency)}
                  </span>
                  <div className="small-text">{account.type}</div>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="secondary-btn"
            href={`/business/${businessId}/cuentas`}
          >
            Gestionar cuentas
          </Link>
        </section>

        <section className="panel">
          <h3>Actividad reciente</h3>
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
                    <span className={amount >= 0 ? "success-text" : "error-text"}>
                      {amount >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(amount), currency)}
                    </span>
                    <div className="small-text">
                      {item.category ? `${item.category} · ` : ""}
                      {new Date(
                        item.date ?? item.createdAt,
                      ).toLocaleDateString("es")}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            className="secondary-btn"
            href={`/business/${businessId}/cuentas`}
          >
            Ver movimientos
          </Link>
        </section>
      </div>

      {lowStock.length > 0 && (
        <section className="panel mt">
          <h3>Alertas de stock bajo</h3>
          <ul>
            {lowStock.map((product) => (
              <li key={product._id.toString()}>
                <strong>{product.name}</strong> — stock{" "}
                <span className="error-text">{product.stock}</span> (mínimo{" "}
                {product.minStock})
              </li>
            ))}
          </ul>
          <Link
            className="secondary-btn"
            href={`/business/${businessId}/inventario`}
          >
            Ver inventario
          </Link>
        </section>
      )}
    </div>
  );
}