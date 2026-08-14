"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CURRENCIES = ["USD", "EUR", "MXN", "COP", "GTQ"];

export function EditAccountForm({
  accountId,
  initialName,
  initialType,
  initialCurrency,
  initialCreditLimit,
  initialIsActive,
}: {
  accountId: string;
  initialName: string;
  initialType: string;
  initialCurrency: string;
  initialCreditLimit: number;
  initialIsActive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState(initialType);
  const [currency, setCurrency] = useState(initialCurrency);
  const [creditLimit, setCreditLimit] = useState(
    initialCreditLimit ? (initialCreditLimit / 100).toFixed(2) : "",
  );
  const [isActive, setIsActive] = useState(initialIsActive);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        currency,
        creditLimit:
          type === "credit_card" && creditLimit
            ? Math.round(parseFloat(creditLimit) * 100)
            : null,
        isActive,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "No se pudo actualizar la cuenta");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt">
      {!open ? (
        <button
          type="button"
          className="btn-inline ghost-btn"
          onClick={() => setOpen(true)}
        >
          Editar
        </button>
      ) : (
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`acc-name-${accountId}`}>Nombre</label>
              <input
                id={`acc-name-${accountId}`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`acc-type-${accountId}`}>Tipo</label>
              <select
                id={`acc-type-${accountId}`}
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
              <label htmlFor={`acc-currency-${accountId}`}>Moneda</label>
              <select
                id={`acc-currency-${accountId}`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {type === "credit_card" && (
              <div className="form-group">
                <label htmlFor={`acc-limit-${accountId}`}>Límite</label>
                <input
                  id={`acc-limit-${accountId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor={`acc-active-${accountId}`}>Activa</label>
              <select
                id={`acc-active-${accountId}`}
                value={isActive ? "1" : "0"}
                onChange={(e) => setIsActive(e.target.value === "1")}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
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