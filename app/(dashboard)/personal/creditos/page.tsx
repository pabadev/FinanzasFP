import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import { CreditsPanel } from "@/components/dashboard/CreditsPanel";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Credit from "@/models/Credit";

export default async function PersonalCreditsPage() {
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
  const currency = personalEntity.baseCurrency ?? "USD";

  const [accounts, credits] = await Promise.all([
    Account.find({ entity: entityId, isActive: true }),
    Credit.find({ entity: entityId }).sort({ createdAt: -1 }),
  ]);

  return (
    <div>
      <header className="page-head">
        <h2>Créditos y préstamos</h2>
      </header>
      <CreditsPanel
        entityId={entityId}
        credits={credits}
        accounts={accounts}
        currency={currency}
      />
    </div>
  );
}