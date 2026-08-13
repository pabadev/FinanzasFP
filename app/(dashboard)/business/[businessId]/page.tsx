import Link from "next/link";
import { MetricCard } from "@/components/dashboard/MetricCard";

export default function BusinessDashboardPage({
  params,
}: {
  params: { businessId: string };
}) {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>Negocio #{params.businessId}</h2>
        </div>
        <nav>
          <Link href={`/business/${params.businessId}`}>Resumen</Link>
          <Link href={`/business/${params.businessId}/pos`}>POS</Link>
          <Link href={`/business/${params.businessId}/inventory`}>
            Inventario
          </Link>
        </nav>
      </header>

      <div className="summary-grid">
        <MetricCard label="Ventas" value="$24,500" detail="Este mes" />
        <MetricCard label="Margen" value="32%" detail="Neto" />
        <MetricCard label="Clientes" value="184" detail="Activos" />
        <MetricCard label="Cobranza" value="$9,300" detail="Pendientes" />
      </div>

      <section className="panel">
        <h3>Operación del negocio</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Estado</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Venta del día</td>
              <td>Pagada</td>
              <td>$1,240.00</td>
            </tr>
            <tr>
              <td>Compra de insumos</td>
              <td>Proceso</td>
              <td>$640.00</td>
            </tr>
            <tr>
              <td>Transferencia interna</td>
              <td>Confirmada</td>
              <td>$2,100.00</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
