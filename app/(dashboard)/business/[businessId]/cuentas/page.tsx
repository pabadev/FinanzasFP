import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { getConsolidatedAccounts } from "@/services/consolidationService";
import { AccountsPanel } from "@/components/dashboard/AccountsPanel";
import { MovementsPanel } from "@/components/dashboard/MovementsPanel";
import { TransfersPanel } from "@/components/dashboard/TransfersPanel";
import { CategoriesPanel } from "@/components/dashboard/CategoriesPanel";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Transaction from "@/models/Transaction";
import Category from "@/models/Category";

export default async function BusinessAccountsPage({
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
  if (!entity) redirect(`/business/${businessId}`);

  const currency = entity.baseCurrency ?? "USD";

  const [accounts, recent, categories, { accounts: allAccounts }] =
    await Promise.all([
      Account.find({ entity: businessId, isActive: true }),
      Transaction.find({ entity: businessId }).sort({ date: -1 }).limit(10),
      Category.find({ entity: businessId }),
      getConsolidatedAccounts(session.user.id),
    ]);

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
          entityId={businessId}
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
          entityId={businessId}
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
      <div className="grid-two mt">
        <TransfersPanel transferAccounts={transferAccounts} />
        <CategoriesPanel
          entityId={businessId}
          categories={categoriesForForm}
        />
      </div>
    </div>
  );
}