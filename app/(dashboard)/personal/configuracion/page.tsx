import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { CategoriesPanel } from "@/components/dashboard/CategoriesPanel";
import { ExchangeRateForm } from "@/components/forms/ExchangeRateForm";
import Entity from "@/models/Entity";
import Category from "@/models/Category";
import ExchangeRate from "@/models/ExchangeRate";

export default async function PersonalConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();

  const entityIds = await getUserEntityIds(session.user.id);
  const personalEntity = await Entity.findOne({
    _id: { $in: entityIds },
    type: "personal",
  });

  if (!personalEntity) redirect("/personal");

  const entityId = personalEntity._id.toString();

  const [categories, exchangeRates] = await Promise.all([
    Category.find({ entity: entityId }),
    ExchangeRate.find().sort({ from: 1, to: 1 }),
  ]);

  return (
    <div>
      <header className="page-head">
        <h2>Configuración</h2>
      </header>
      <div className="grid-two">
        <CategoriesPanel
          entityId={entityId}
          categories={categories.map((category) => ({
            name: category.name,
            type: category.type,
          }))}
        />
        <section className="panel">
          <h3>Tipos de cambio</h3>
          {exchangeRates.length === 0 ? (
            <p className="small-text">
              Sin tipos de cambio. Añade los pares para conversión entre
              monedas.
            </p>
          ) : (
            <ul>
              {exchangeRates.map((rate) => (
                <li key={`${rate.from}-${rate.to}`}>
                  {rate.from} → {rate.to} = {rate.rate}
                  {rate.source ? (
                    <span className="small-text"> · {rate.source}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <ExchangeRateForm />
        </section>
      </div>
    </div>
  );
}