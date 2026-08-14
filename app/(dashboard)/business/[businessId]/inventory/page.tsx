import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import { CreateProductForm } from "@/components/forms/CreateProductForm";
import Product from "@/models/Product";
import Entity from "@/models/Entity";

export default async function InventoryPage({
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

  const products = await Product.find({ entity: businessId }).sort({
    name: 1,
  });

  const lowStock = products.filter(
    (product) =>
      product.type === "physical" &&
      (product.stock ?? 0) <= (product.minStock ?? 0),
  );

  const recentMovements = products
    .flatMap((product) =>
      (product.stockMovements ?? [])
        .slice(-5)
        .map((movement: {
          date: Date;
          change: number;
          reason: string;
        }) => ({
          productName: product.name,
          change: movement.change,
          reason: movement.reason,
          date: movement.date,
        })),
    )
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 10);

  return (
    <div>
      <header className="page-head">
        <h2>Inventario</h2>
      </header>

      {lowStock.length > 0 && (
        <section className="panel">
          <h3>Alertas de stock bajo</h3>
          <ul>
            {lowStock.map((product) => (
              <li key={product._id.toString()}>
                <strong>{product.name}</strong> — stock{" "}
                <span className="error-text">{product.stock}</span> (mínimo{" "}
                {product.minStock})
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel mt">
        <h3>Productos</h3>
        {products.length === 0 ? (
          <p className="small-text">Sin productos todavía.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Tipo</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isLow =
                  product.type === "physical" &&
                  (product.stock ?? 0) <= (product.minStock ?? 0);
                return (
                  <tr key={product._id.toString()}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>
                      {product.type === "physical" ? "Físico" : "Servicio"}
                    </td>
                    <td>{product.stock ?? 0}</td>
                    <td>{product.minStock ?? 0}</td>
                    <td>
                      {formatMoney(product.price ?? 0, currency)}
                    </td>
                    <td>
                      {product.type === "physical" ? (
                        isLow ? (
                          <span className="error-text">Stock bajo</span>
                        ) : (
                          <span className="success-text">OK</span>
                        )
                      ) : (
                        <span className="small-text">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <CreateProductForm entityId={businessId} />
      </section>

      <section className="panel mt">
        <h3>Movimientos de stock recientes</h3>
        {recentMovements.length === 0 ? (
          <p className="small-text">Sin movimientos todavía.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cambio</th>
                <th>Razón</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((movement, index) => (
                <tr key={index}>
                  <td>{movement.productName}</td>
                  <td
                    className={
                      (movement.change ?? 0) >= 0
                        ? "success-text"
                        : "error-text"
                    }
                  >
                    {movement.change >= 0 ? "+" : ""}
                    {movement.change}
                  </td>
                  <td>{movement.reason}</td>
                  <td>
                    {new Date(movement.date).toLocaleDateString("es")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}