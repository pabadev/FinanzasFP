import Link from "next/link";

import { CreateBusinessEntityForm } from "@/components/forms/CreateBusinessEntityForm";

export interface BusinessRow {
  _id: string;
  name: string;
  baseCurrency: string;
}

export function EntitiesPanel({
  businessEntities,
}: {
  businessEntities: BusinessRow[];
}) {
  return (
    <section className="panel">
      <h3>Negocios</h3>
      {businessEntities.length === 0 ? (
        <p className="small-text">Sin negocios todavía.</p>
      ) : (
        <ul>
          {businessEntities.map((business) => (
            <li key={business._id}>
              <Link href={`/business/${business._id}`}>
                <strong>{business.name}</strong>
              </Link>
              <div className="small-text">{business.baseCurrency}</div>
            </li>
          ))}
        </ul>
      )}
      <CreateBusinessEntityForm />
    </section>
  );
}