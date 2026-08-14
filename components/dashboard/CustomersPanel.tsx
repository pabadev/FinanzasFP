import { CreateCustomerForm } from "@/components/forms/CreateCustomerForm";
import { formatMoney } from "@/lib/money";

export interface CustomerRow {
  _id: string;
  name: string;
  debt: number;
}

export function CustomersPanel({
  entityId,
  customers,
  currency,
}: {
  entityId: string;
  customers: CustomerRow[];
  currency: string;
}) {
  return (
    <section className="panel">
      <h3>Clientes</h3>
      {customers.length === 0 ? (
        <p className="small-text">Sin clientes todavía.</p>
      ) : (
        <ul>
          {customers.map((customer) => (
            <li key={customer._id}>
              <strong>{customer.name}</strong>
              {customer.debt > 0 ? (
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
      <CreateCustomerForm entityId={entityId} />
    </section>
  );
}