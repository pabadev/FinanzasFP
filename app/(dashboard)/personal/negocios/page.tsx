import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { EntitiesPanel } from "@/components/dashboard/EntitiesPanel";
import Entity from "@/models/Entity";

export default async function PersonalBusinessesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();

  const entityIds = await getUserEntityIds(session.user.id);
  const businessEntities = await Entity.find({
    _id: { $in: entityIds },
    type: "business",
  }).sort({ createdAt: 1 });

  return (
    <div>
      <header className="page-head">
        <h2>Mis negocios</h2>
      </header>
      <EntitiesPanel
        businessEntities={businessEntities.map((business) => ({
          _id: business._id.toString(),
          name: business.name,
          baseCurrency: business.baseCurrency ?? "USD",
        }))}
      />
    </div>
  );
}