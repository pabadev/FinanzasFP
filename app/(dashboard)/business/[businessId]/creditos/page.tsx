import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { requireEntityMembership } from "@/lib/rbac";
import { CreditsPanel } from "@/components/dashboard/CreditsPanel";
import Entity from "@/models/Entity";
import Account from "@/models/Account";
import Credit from "@/models/Credit";

export default async function BusinessCreditsPage({
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

  const [accounts, credits] = await Promise.all([
    Account.find({ entity: businessId, isActive: true }),
    Credit.find({ entity: businessId }).sort({ createdAt: -1 }),
  ]);

  return (
    <div>
      <header className="page-head">
        <h2>Créditos y préstamos</h2>
      </header>
      <CreditsPanel
        entityId={businessId}
        credits={credits}
        accounts={accounts}
        currency={currency}
      />
    </div>
  );
}