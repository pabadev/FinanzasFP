import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { PosCheckout } from "@/components/pos/PosCheckout";
import { CreateCustomerForm } from "@/components/forms/CreateCustomerForm";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import Account from "@/models/Account";

export default async function PosPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  await requireEntityMembership(session.user.id, businessId);
  await connectDB();

  const products = await Product.find({ entity: businessId }).sort({
    name: 1,
  });
  const customers = await Customer.find({ entity: businessId }).sort({
    name: 1,
  });
  const accounts = await Account.find({
    entity: businessId,
    isActive: true,
  }).sort({ createdAt: 1 });

  const productsForForm = products.map((product) => ({
    _id: product._id.toString(),
    name: product.name,
    price: product.price ?? 0,
    type: product.type,
    stock: product.stock ?? 0,
  }));

  const customersForForm = customers.map((customer) => ({
    _id: customer._id.toString(),
    name: customer.name,
  }));

  const accountsForForm = accounts.map((account) => ({
    _id: account._id.toString(),
    name: account.name,
  }));

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>POS · Negocio #{businessId}</h2>
        </div>
        <nav>
          <Link href={`/business/${businessId}`}>Resumen</Link>
          <Link href={`/business/${businessId}/pos`}>POS</Link>
          <Link href={`/business/${businessId}/inventory`}>Inventario</Link>
        </nav>
      </header>

      <PosCheckout
        entityId={businessId}
        products={productsForForm}
        customers={customersForForm}
        accounts={accountsForForm}
      />

      <section className="panel mt">
        <h3>Clientes</h3>
        {customers.length === 0 ? (
          <p className="small-text">
            Sin clientes. Crea uno para poder vender a crédito.
          </p>
        ) : (
          <ul>
            {customers.map((customer) => (
              <li key={customer._id.toString()}>
                {customer.name}
                {customer.debt ? (
                  <span className="small-text">
                    {" "}
                    · Deuda $
                    {(customer.debt / 100).toLocaleString("es", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <CreateCustomerForm entityId={businessId} />
      </section>
    </div>
  );
}