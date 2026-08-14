"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AccountOption {
  _id: string;
  name: string;
  entityId: string;
  entityName: string;
  entityType: "personal" | "business";
  currency: string;
}

const TYPE_LABELS: Record<string, string> = {
  transfer_out: "Transferencia interna",
  capital_injection: "Aporte de capital (personal → negocio)",
  partner_withdrawal: "Retiro de socio (negocio → personal)",
  interentity_loan: "Préstamo entre negocios",
};

export function CreateTransferForm({
  accounts,
}: {
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?._id ?? "");
  const [toAccountId, setToAccountId] = useState(
    accounts[1]?._id ?? accounts[0]?._id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("transfer_out");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const fromAccount = accounts.find((a) => a._id === fromAccountId);

  function computeType(fromId: string, toId: string): string {
    const from = accounts.find((a) => a._id === fromId);
    const to = accounts.find((a) => a._id === toId);
    if (!from || !to) return "transfer_out";
    if (from.entityId === to.entityId) return "transfer_out";
    if (from.entityType === "personal") return "capital_injection";
    if (to.entityType === "personal") return "partner_withdrawal";
    return "interentity_loan";
  }

  function handleFromChange(value: string) {
    setFromAccountId(value);
    setType(computeType(value, toAccountId));
  }

  function handleToChange(value: string) {
    setToAccountId(value);
    setType(computeType(fromAccountId, value));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Monto inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amount: cents,
        currency: fromAccount?.currency,
        type,
        description: description || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo hacer la transferencia");
      return;
    }

    setAmount("");
    setDescription("");
    setSuccess("Transferencia completada");
    router.refresh();
  }

  const otherAccounts = accounts.filter((a) => a._id !== fromAccountId);

  return (
    <div className="mt">
      {!open ? (
        <button
          type="button"
          className="btn-inline"
          onClick={() => setOpen(true)}
        >
          Nueva transferencia
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="transfer-from">Desde</label>
              <select
                id="transfer-from"
                value={fromAccountId}
                onChange={(e) => handleFromChange(e.target.value)}
                required
              >
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.entityName} · {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-to">Hacia</label>
              <select
                id="transfer-to"
                value={toAccountId}
                onChange={(e) => handleToChange(e.target.value)}
                required
              >
                {otherAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.entityName} · {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-amount">Monto</label>
              <input
                id="transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="transfer-type">Tipo</label>
              <select
                id="transfer-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="transfer-desc">Descripción</label>
              <input
                id="transfer-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="small-text error-text">{error}</p>}
          {success && <p className="small-text success-text">{success}</p>}

          <div className="form-row">
            <button type="submit" className="btn-inline" disabled={loading}>
              {loading ? "Procesando..." : "Transferir"}
            </button>
            <button
              type="button"
              className="btn-inline ghost-btn"
              onClick={() => {
                setOpen(false);
                setError("");
                setSuccess("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}