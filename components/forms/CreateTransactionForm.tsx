"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AccountOption {
  _id: string;
  name: string;
}

export function CreateTransactionForm({
  entityId,
  accounts,
}: {
  entityId: string;
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [account, setAccount] = useState(accounts[0]?._id ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Monto inválido");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: entityId,
        account,
        type,
        amount: cents,
        category: category || undefined,
        description: description || undefined,
        date: date || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo registrar el movimiento");
      return;
    }

    setAmount("");
    setCategory("");
    setDescription("");
    setDate("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt">
      {!open ? (
        <button
          type="button"
          className="btn-inline"
          onClick={() => setOpen(true)}
        >
          Registrar movimiento
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tx-type">Tipo</label>
              <select
                id="tx-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "income" | "expense")
                }
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tx-account">Cuenta</label>
              <select
                id="tx-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tx-amount">Monto</label>
              <input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tx-category">Categoría</label>
              <input
                id="tx-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tx-date">Fecha</label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tx-description">Descripción</label>
            <input
              id="tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="small-text error-text">{error}</p>}

          <div className="form-row">
            <button type="submit" className="btn-inline" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn-inline ghost-btn"
              onClick={() => {
                setOpen(false);
                setError("");
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
