import { VoidSaleButton } from "@/components/forms/VoidSaleButton";
import { formatMoney } from "@/lib/money";

export interface SaleRow {
  _id: string;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  customerName: string;
  date: string;
}

export function SalesPanel({
  sales,
  currency,
}: {
  sales: SaleRow[];
  currency: string;
}) {
  return (
    <section className="panel">
      <h3>Ventas recientes</h3>
      {sales.length === 0 ? (
        <p className="small-text">Sin ventas todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale._id}>
                <td>{new Date(sale.date).toLocaleDateString("es")}</td>
                <td>{sale.customerName || "—"}</td>
                <td>{formatMoney(sale.total, currency)}</td>
                <td>{sale.paymentMethod}</td>
                <td>
                  {sale.status === "voided" ? (
                    <span className="small-text">Anulada</span>
                  ) : sale.status === "paid" ? (
                    <span className="success-text">Pagada</span>
                  ) : (
                    <span className="error-text">{sale.status}</span>
                  )}
                </td>
                <td>
                  {sale.status !== "voided" && (
                    <VoidSaleButton saleId={sale._id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}