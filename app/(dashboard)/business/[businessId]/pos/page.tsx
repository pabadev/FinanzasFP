import Link from "next/link";

export default async function PosPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>POS · Negocio #{businessId}</h2>
        </div>
        <nav>
          <Link href={`/business/${businessId}`}>Resumen</Link>
          <Link href={`/business/${businessId}/pos`}>POS</Link>
          <Link href={`/business/${businessId}/inventory`}>
            Inventario
          </Link>
        </nav>
      </header>

      <div className="grid-two">
        <section className="panel">
          <h3>Venta actual</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Agua mineral 500ml</td>
                <td>2</td>
                <td>$10.00</td>
              </tr>
              <tr>
                <td>Galletas surtidas</td>
                <td>3</td>
                <td>$18.00</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Pago</h3>
          <div className="form-group">
            <label>Medio de pago</label>
            <select defaultValue="cash">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="credit">Crédito</option>
            </select>
          </div>
          <div className="form-group">
            <label>Total</label>
            <input value="$42.00" readOnly />
          </div>
          <button type="button">Completar venta</button>
        </section>
      </div>
    </div>
  );
}
