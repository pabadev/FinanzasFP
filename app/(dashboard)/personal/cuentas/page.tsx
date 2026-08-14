import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { getConsolidatedAccounts } from "@/services/consolidationService";
import { AccountsPanel } from "@/components/dashboard/AccountsPanel";
import { MovementsPanel } from "@/components/dashboard/MovementsPanel";
import { TransfersPanel } from "@/components/dashboard/TransfersPanel";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Category from "@/models/Category";

export default async function PersonalAccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();

  const entityIds = await getUserEntityIds(session.user.id);
  const personalEntity = await Entity.findOne({
    _id: { $in: entityIds },
    type: "personal",
  });

  if (!personalEntity) redirect("/personal");

  const entityId = personalEntity._id.toString();
  const currency = personalEntity.baseCurrency ?? "USD";

  const accounts = await Account.find({ entity: entityId, isActive: true });
  const recent = await Transaction.find({ entity: entityId })
    .sort({ date: -1 })
    .limit(10);
  const categories = await Category.find({ user: session.user.id });
  const { accounts: allAccounts } = await getConsolidatedAccounts(
    session.user.id,
  );

  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

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

  return (
    <div>
      <header className="page-head">
        <h2>Cuentas y movimientos</h2>
      </header>
      <div className="grid-two">
        <AccountsPanel
          entityId={entityId}
          accounts={accounts.map((account) => ({
            _id: account._id.toString(),
            name: account.name,
            type: account.type,
            balance: account.balance ?? 0,
            currency: account.currency,
            creditLimit: account.creditLimit ?? 0,
            isActive: account.isActive,
          }))}
          currency={currency}
        />
        <MovementsPanel
          entityId={entityId}
          transactions={recent.map((tx) => ({
            _id: tx._id.toString(),
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: (tx.date ?? tx.createdAt).toISOString(),
          }))}
          categories={categoriesForForm}
          accounts={accountsForForm}
          currency={currency}
        />
      </div>
      <div className="mt">
        <TransfersPanel transferAccounts={transferAccounts} />
      </div>
    </div>
  );
}