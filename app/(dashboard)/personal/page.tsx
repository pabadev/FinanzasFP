import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import {
  getConsolidatedAccounts,
  getExchangeRateMap,
  convertAmount,
} from "@/services/consolidationService";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PersonalOnboarding } from "@/components/dashboard/PersonalOnboarding";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";

export default async function PersonalDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();

  const entityIds = await getUserEntityIds(session.user.id);
  const personalEntity = await Entity.findOne({
    _id: { $in: entityIds },
    type: "personal",
  });
  const businessEntities = await Entity.find({
    _id: { $in: entityIds },
    type: "business",
  });

  if (!personalEntity) {
    return <PersonalOnboarding />;
  }

  const entityId = personalEntity._id.toString();
  const accounts = await Account.find({ entity: entityId, isActive: true });
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthTxs = await Transaction.find({
    entity: entityId,
    date: { $gte: monthStart },
  }).select("type amount");

  let income = 0;
  let expense = 0;
  let transfers = 0;

  for (const tx of monthTxs) {
    if (tx.type === "income" || tx.type === "sale_payment") {
      income += tx.amount;
    } else if (tx.type === "expense") {
      expense += tx.amount;
    } else if (tx.type === "transfer_in" || tx.type === "transfer_out") {
      transfers += 1;
    }
  }

  const balance = accounts.reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0,
  );

  const recent = await Transaction.find({ entity: entityId })
    .sort({ date: -1 })
    .limit(5);

  const { accounts: allAccounts } = await getConsolidatedAccounts(
    session.user.id,
  );
  const rates = await getExchangeRateMap();

  const consolidated = [personalEntity, ...businessEntities].map((entity) => {
    const entityAccounts = allAccounts.filter(
      (account) => account.entityId === entity._id.toString(),
    );
    const rawBalance = entityAccounts.reduce(
      (sum, account) => sum + (account.balance ?? 0),
      0,
    );
    const converted = convertAmount(
      rawBalance,
      entity.baseCurrency ?? "USD",
      personalEntity.baseCurrency ?? "USD",
      rates,
    );
    return {
      _id: entity._id.toString(),
      name: entity.name,
      type: entity.type,
      currency: entity.baseCurrency ?? "USD",
      balance: rawBalance,
      converted,
      hasRate: Number.isFinite(converted),
    };
  });

  const totalConsolidated = consolidated
    .filter((item) => item.hasRate)
    .reduce((sum, item) => sum + item.converted, 0);
  const allConverted = consolidated.every((item) => item.hasRate);

  const currency = personalEntity.baseCurrency ?? "USD";

  return (
    <div>
      <header className="page-head">
        <h2>Mi resumen</h2>
        <div className="page-head-actions">
          <Link className="secondary-btn" href="/personal/cuentas">
            Cuentas y movimientos
          </Link>
          <Link className="secondary-btn" href="/personal/creditos">
            Créditos
          </Link>
          <Link className="secondary-btn" href="/personal/negocios">
            Negocios
          </Link>
        </div>
      </header>

      <div className="summary-grid">
        <MetricCard
          label="Ingresos"
          value={formatMoney(income, currency)}
          detail="Este mes"
        />
        <MetricCard
          label="Gastos"
          value={formatMoney(expense, currency)}
          detail="Este mes"
        />
        <MetricCard
          label="Saldo"
          value={formatMoney(balance, currency)}
          detail="Total de cuentas"
        />
        <MetricCard
          label="Transferencias"
          value={transfers.toString()}
          detail="Este mes"
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
          <Link className="secondary-btn" href="/personal/cuentas">
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
          <Link className="secondary-btn" href="/personal/cuentas">
            Ver movimientos
          </Link>
        </section>
      </div>

      <section className="panel mt">
        <h3>Balance consolidado</h3>
        {consolidated.length === 0 ? (
          <p className="small-text">Sin entidades.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Tipo</th>
                <th>Saldo</th>
                <th>En {currency}</th>
              </tr>
            </thead>
            <tbody>
              {consolidated.map((item) => (
                <tr key={item._id}>
                  <td>
                    {item.type === "business" && (
                      <Link href={`/business/${item._id}`}>{item.name}</Link>
                    )}
                    {item.type === "personal" && item.name}
                  </td>
                  <td>
                    {item.type === "personal" ? "Personal" : "Negocio"}
                  </td>
                  <td>{formatMoney(item.balance, item.currency)}</td>
                  <td>
                    {item.hasRate ? (
                      formatMoney(item.converted, currency)
                    ) : (
                      <span className="small-text">
                        Sin tipo de cambio {item.currency} → {currency}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td></td>
                <td></td>
                <td>
                  <strong>
                    {allConverted
                      ? formatMoney(totalConsolidated, currency)
                      : "Faltan tipos de cambio"}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}