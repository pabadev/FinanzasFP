import { SalePaymentForm } from "@/components/forms/SalePaymentForm";
import { formatMoney } from "@/lib/money";

export interface PendingSaleRow {
  _id: string;
  total: number;
  paidAmount: number;
  status: string;
  customerName: string;
}

export interface FormAccount {
  _id: string;
  name: string;
}

export function ReceivablesPanel({
  pendingSales,
  accounts,
  currency,
}: {
  pendingSales: PendingSaleRow[];
  accounts: FormAccount[];
  currency: string;
}) {
  return (
    <section className="panel">
      <h3>Cuentas por cobrar</h3>
      {pendingSales.length === 0 ? (
        <p className="small-text">
          Sin ventas pendientes. Las ventas a crédito aparecen aquí.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Venta</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {pendingSales.map((sale) => {
              const pending = sale.total - sale.paidAmount;
              return (
                <tr key={sale._id}>
                  <td>{sale.customerName}</td>
                  <td>#{sale._id.slice(-6)}</td>
                  <td>{formatMoney(sale.total, currency)}</td>
                  <td>{formatMoney(sale.paidAmount, currency)}</td>
                  <td>
                    <strong className="error-text">
                      {formatMoney(pending, currency)}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {pendingSales.length > 0 && (
        <SalePaymentForm
          pendingSales={pendingSales.map((sale) => ({
            _id: sale._id,
            total: sale.total,
            paidAmount: sale.paidAmount,
            customerName: sale.customerName || "Sin cliente",
          }))}
          accounts={accounts}
        />
      )}
    </section>
  );
}