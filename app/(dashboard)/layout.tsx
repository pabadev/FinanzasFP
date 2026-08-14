import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";
import Entity from "@/models/Entity";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await connectDB();

  const entityIds = await getUserEntityIds(session.user.id);
  const entities = await Entity.find({
    _id: { $in: entityIds },
  }).sort({ createdAt: 1 });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      entities={entities.map((entity) => ({
        _id: entity._id.toString(),
        name: entity.name,
        type: entity.type as "personal" | "business",
      }))}
    >
      {children}
    </AppShell>
  );
}