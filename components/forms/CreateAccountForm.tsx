"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateAccountForm({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [currency, setCurrency] = useState("USD");
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: entityId,
        name,
        type,
        currency,
        creditLimit:
          type === "credit_card" && creditLimit
            ? Math.round(parseFloat(creditLimit) * 100)
            : 0,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo crear la cuenta");
      return;
    }

    setName("");
    setCreditLimit("");
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
          Nueva cuenta
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="account-name">Nombre</label>
              <input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="account-type">Tipo</label>
              <select
                id="account-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="bank">Banco</option>
                <option value="cash">Efectivo</option>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="wallet">Billetera</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="account-currency">Moneda</label>
              <select
                id="account-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="COP">COP</option>
                <option value="GTQ">GTQ</option>
              </select>
            </div>

            {type === "credit_card" && (
              <div className="form-group">
                <label htmlFor="account-limit">Límite de crédito</label>
                <input
                  id="account-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
            )}
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
