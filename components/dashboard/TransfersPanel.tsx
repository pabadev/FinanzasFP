import { CreateTransferForm } from "@/components/forms/CreateTransferForm";

export interface TransferAccount {
  _id: string;
  name: string;
  entityId: string;
  entityName: string;
  entityType: "personal" | "business";
  currency: string;
}

export function TransfersPanel({
  transferAccounts,
}: {
  transferAccounts: TransferAccount[];
}) {
  return (
    <section className="panel">
      <h3>Transferencias</h3>
      <p className="small-text">
        Mueve dinero entre cuentas (misma o distinta entidad y moneda).
      </p>
      {transferAccounts.length > 1 ? (
        <CreateTransferForm accounts={transferAccounts} />
      ) : (
        <p className="small-text">
          Necesitas al menos dos cuentas para transferir.
        </p>
      )}
    </section>
  );
}