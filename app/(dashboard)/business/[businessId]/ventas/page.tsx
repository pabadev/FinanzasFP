import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { SalesPanel } from "@/components/dashboard/SalesPanel";
import { ReceivablesPanel } from "@/components/dashboard/ReceivablesPanel";
import { CustomersPanel } from "@/components/dashboard/CustomersPanel";
import Entity from "@/models/Entity";
import Sale from "@/models/Sale";
import Customer from "@/models/Customer";
import Account from "@/models/Account";

export default async function BusinessSalesPage({
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

  const [recentSales, pendingSales, customers, accounts] = await Promise.all([
    Sale.find({ entity: businessId })
      .populate("customer", "name")
      .sort({ createdAt: -1 })
      .limit(20),
    Sale.find({ entity: businessId, status: { $in: ["pending", "partial"] } })
      .populate("customer", "name")
      .sort({ createdAt: -1 })
      .limit(20),
    Customer.find({ entity: businessId }).sort({ name: 1 }),
    Account.find({ entity: businessId, isActive: true }),
  ]);

  const customerNameOf = (
    sale: { customer: unknown },
  ) =>
    (sale.customer as { name?: string } | null)?.name ?? "Sin cliente";

  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

  return (
    <div>
      <header className="page-head">
        <h2>Ventas y clientes</h2>
      </header>
      <div className="grid-two">
        <SalesPanel
          sales={recentSales.map((sale) => ({
            _id: sale._id.toString(),
            total: sale.total,
            paidAmount: sale.paidAmount ?? 0,
            paymentMethod: sale.paymentMethod,
            status: sale.status,
            customerName: customerNameOf(sale),
            date: (sale.createdAt ?? sale._id.getTimestamp()).toISOString(),
          }))}
          currency={currency}
        />
        <div>
          <ReceivablesPanel
            pendingSales={pendingSales.map((sale) => ({
              _id: sale._id.toString(),
              total: sale.total,
              paidAmount: sale.paidAmount ?? 0,
              status: sale.status,
              customerName: customerNameOf(sale),
            }))}
            accounts={accountsForForm}
            currency={currency}
          />
          <div className="mt">
            <CustomersPanel
              entityId={businessId}
              customers={customers.map((customer) => ({
                _id: customer._id.toString(),
                name: customer.name,
                debt: customer.debt ?? 0,
              }))}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </div>
  );
}