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
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PersonalOnboarding } from "@/components/dashboard/PersonalOnboarding";
import { CreditsPanel } from "@/components/dashboard/CreditsPanel";
import { CreateAccountForm } from "@/components/forms/CreateAccountForm";
import { CreateTransactionForm } from "@/components/forms/CreateTransactionForm";
import { CreateTransferForm } from "@/components/forms/CreateTransferForm";
import { CreateCategoryForm } from "@/components/forms/CreateCategoryForm";
import { CreateBusinessEntityForm } from "@/components/forms/CreateBusinessEntityForm";
import { ExchangeRateForm } from "@/components/forms/ExchangeRateForm";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Credit from "@/models/Credit";
import Category from "@/models/Category";
import ExchangeRate from "@/models/ExchangeRate";

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
    .limit(10);

  const credits = await Credit.find({ entity: entityId }).sort({
    createdAt: -1,
  });

  const categories = await Category.find({ entity: entityId });
  const exchangeRates = await ExchangeRate.find().sort({ from: 1, to: 1 });
  const { accounts: allAccounts } = await getConsolidatedAccounts(
    session.user.id,
  );
  const rates = await getExchangeRateMap();

  const categoriesForForm = categories.map((category) => ({
    name: category.name,
    type: category.type,
  }));

  const transferAccounts = allAccounts.map((account) => ({
    _id: account._id,
    name: account.name,
    entityId: account.entityId,
    entityName: account.entityName,
    entityType: account.entityType,
    currency: account.currency,
  }));

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

  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>Dashboard personal</h2>
        </div>
        <nav>
          <Link href="/personal">Personal</Link>
          {businessEntities.length > 0 ? (
            <Link href={`/business/${businessEntities[0]._id}`}>Negocio</Link>
          ) : null}
          <SignOutButton />
        </nav>
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
          detail="Total consolidado"
        />
        <MetricCard
          label="Transferencias"
          value={transfers.toString()}
          detail="Últimos 30 días"
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
          <CreateAccountForm entityId={entityId} />
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
            entityId={entityId}
            accounts={accountsForForm}
            categories={categoriesForForm}
          />
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
                  <td>{item.name}</td>
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

      <div className="grid-two mt">
        <section className="panel">
          <h3>Negocios</h3>
          {businessEntities.length === 0 ? (
            <p className="small-text">Sin negocios todavía.</p>
          ) : (
            <ul>
              {businessEntities.map((business) => (
                <li key={business._id.toString()}>
                  <Link href={`/business/${business._id}`}>
                    <strong>{business.name}</strong>
                  </Link>
                  <div className="small-text">
                    {business.baseCurrency ?? "USD"}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CreateBusinessEntityForm />
        </section>

        <section className="panel">
          <h3>Transferencias</h3>
          <p className="small-text">
            Mueve dinero entre cuentas (misma o distinta entidad y moneda).
          </p>
          {transferAccounts.length > 1 ? (
            <CreateTransferForm accounts={transferAccounts} />
          ) : (
            <p className="small-text">
              Necesitas al menos dos cuentas para transferir.
            </p>
          )}
        </section>
      </div>

      <div className="grid-two mt">
        <section className="panel">
          <h3>Categorías</h3>
          {categories.length === 0 ? (
            <p className="small-text">Sin categorías todavía.</p>
          ) : (
            <ul>
              {categories.map((category) => (
                <li key={category._id.toString()}>
                  {category.name}{" "}
                  <span className="small-text">
                    ({category.type === "income" ? "ingreso" : "gasto"})
                  </span>
                </li>
              ))}
            </ul>
          )}
          <CreateCategoryForm entityId={entityId} />
        </section>

        <section className="panel">
          <h3>Tipos de cambio</h3>
          {exchangeRates.length === 0 ? (
            <p className="small-text">
              Sin tipos de cambio. Añade los pares para conversión entre
              monedas.
            </p>
          ) : (
            <ul>
              {exchangeRates.map((rate) => (
                <li key={`${rate.from}-${rate.to}`}>
                  {rate.from} → {rate.to} = {rate.rate}
                  {rate.source ? (
                    <span className="small-text"> · {rate.source}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <ExchangeRateForm />
        </section>
      </div>

      <div className="mt">
        <CreditsPanel
          entityId={entityId}
          credits={credits}
          accounts={accounts}
          currency={currency}
        />
      </div>
    </div>
  );
}
