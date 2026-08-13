import Link from "next/link";

export default function PosPage({
  params,
}: {
  params: { businessId: string };
}) {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>POS · Negocio #{params.businessId}</h2>
        </div>
        <nav>
          <Link href={`/business/${params.businessId}`}>Resumen</Link>
          <Link href={`/business/${params.businessId}/pos`}>POS</Link>
          <Link href={`/business/${params.businessId}/inventory`}>
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
