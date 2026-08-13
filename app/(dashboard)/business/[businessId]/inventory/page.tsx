import Link from "next/link";

const products = [
  { name: "Agua mineral 500ml", sku: "A-001", stock: 42, price: "$10.00" },
  { name: "Galletas surtidas", sku: "G-204", stock: 18, price: "$6.00" },
  {
    name: "Servicio de mantenimiento",
    sku: "S-111",
    stock: 0,
    price: "$150.00",
  },
];

export default function InventoryPage({
  params,
}: {
  params: { businessId: string };
}) {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h2>Inventario · Negocio #{params.businessId}</h2>
        </div>
        <nav>
          <Link href={`/business/${params.businessId}`}>Resumen</Link>
          <Link href={`/business/${params.businessId}/pos`}>POS</Link>
          <Link href={`/business/${params.businessId}/inventory`}>
            Inventario
          </Link>
        </nav>
      </header>

      <section className="panel">
        <h3>Productos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.sku}>
                <td>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.stock}</td>
                <td>{product.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
