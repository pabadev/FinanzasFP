import Entity from "@/models/Entity";
import Account from "@/models/Account";
import ExchangeRate from "@/models/ExchangeRate";
import { connectDB } from "@/lib/db";
import { getUserEntityIds } from "@/lib/rbac";

export async function getConsolidatedAccounts(userId: string) {
  await connectDB();
  const entityIds = await getUserEntityIds(userId);
  const entities = await Entity.find({ _id: { $in: entityIds } });
  const accounts = await Account.find({
    entity: { $in: entityIds },
    isActive: true,
  }).sort({ createdAt: 1 });

  const entityMap = new Map(
    entities.map((entity) => [entity._id.toString(), entity]),
  );

  return {
    entities,
    accounts: accounts.map((account) => {
      const entity = entityMap.get(account.entity.toString());
      return {
        _id: account._id.toString(),
        name: account.name,
        currency: account.currency,
        balance: account.balance,
        entityId: account.entity.toString(),
        entityName: entity?.name ?? "Sin entidad",
        entityType:
          (entity?.type as "personal" | "business") ?? "business",
      };
    }),
  };
}

export async function getExchangeRateMap() {
  await connectDB();
  const rates = await ExchangeRate.find();
  return new Map(rates.map((rate) => [`${rate.from}->${rate.to}`, rate.rate]));
}

export function convertAmount(
  cents: number,
  from: string,
  to: string,
  rates: Map<string, number>,
): number {
  if (from === to) return cents;
  const rate = rates.get(`${from}->${to}`);
  if (!rate) return NaN;
  return Math.round(cents * rate);
}