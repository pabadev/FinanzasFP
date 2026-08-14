import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PersonalOnboarding } from "@/components/dashboard/PersonalOnboarding";
import { CreditsPanel } from "@/components/dashboard/CreditsPanel";
import { CreateAccountForm } from "@/components/forms/CreateAccountForm";
import { CreateTransactionForm } from "@/components/forms/CreateTransactionForm";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Credit from "@/models/Credit";

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
          <CreateTransactionForm entityId={entityId} accounts={accountsForForm} />
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
